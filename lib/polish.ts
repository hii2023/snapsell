// Client-only product-photo cleanup: remove the background on-device, place the
// subject on a clean white background, and apply a light polish. Nothing leaves
// the phone. The model + wasm are downloaded once from the img.ly CDN and then
// cached by the browser, so the first photo is slow and later ones are fast.

export type PolishStage = "download" | "process";
export type PolishProgress = (stage: PolishStage, pct: number) => void;

export async function polishPhoto(
  file: File,
  onProgress?: PolishProgress
): Promise<File> {
  // Dynamic import keeps the heavy library out of the initial bundle and off
  // the server.
  const { removeBackground } = await import("@imgly/background-removal");

  const cutout = await removeBackground(file, {
    model: "isnet_quint8",
    output: { format: "image/png", quality: 0.9 },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress || !total) return;
      const pct = Math.min(100, Math.round((current / total) * 100));
      onProgress(key.startsWith("fetch") ? "download" : "process", pct);
    },
  });

  const img = await createImageBitmap(cutout);
  const w = img.width;
  const h = img.height;

  // Polish pass on a transparent canvas so the cutout keeps its alpha (needed
  // for a clean shadow silhouette).
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  if (!octx) throw new Error("Canvas not supported");
  octx.filter = "brightness(1.03) contrast(1.05) saturate(1.06)";
  octx.drawImage(img, 0, 0);

  // Composite onto a solid white background with a soft drop shadow so the
  // product looks like a studio shot.
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = Math.round(Math.max(w, h) * 0.03);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(h * 0.015);
  ctx.drawImage(off, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );
  if (!blob) throw new Error("Could not render the cleaned photo");

  const base = file.name.replace(/\.[^.]+$/, "") || "product";
  return new File([blob], `${base}-clean.jpg`, { type: "image/jpeg" });
}
