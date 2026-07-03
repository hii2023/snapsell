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

  // Composite the transparent cutout onto a solid white background.
  const img = await createImageBitmap(cutout);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Subtle studio-style polish.
  ctx.filter = "brightness(1.03) contrast(1.05) saturate(1.06)";
  ctx.drawImage(img, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );
  if (!blob) throw new Error("Could not render the cleaned photo");

  const base = file.name.replace(/\.[^.]+$/, "") || "product";
  return new File([blob], `${base}-clean.jpg`, { type: "image/jpeg" });
}
