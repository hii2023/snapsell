"use client";

import { useState } from "react";

const name = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

// Shows /logo.png if present, otherwise falls back to the shop name as text.
export default function Logo({ className = "h-28 w-auto" }: { className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className="text-lg font-semibold">{name}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt={name} className={className} style={{ objectFit: "contain" }} onError={() => setOk(false)} />
  );
}
