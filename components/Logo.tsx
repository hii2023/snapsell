"use client";

import { useState } from "react";

const name = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

// Logo is displayed by zooming into the brand-mark area and cropping the
// built-in whitespace padding from the PNG.
// backgroundSize: 148% zooms so the content fills the container.
// backgroundPosition: 50% 40% centers horizontally, slightly above middle
// vertically so the green dot and Hindi text are visible.
export default function Logo({ className = "" }: { className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className="text-xl font-bold">{name}</span>;
  return (
    <div
      role="img"
      aria-label={name}
      className={className}
      style={{
        width: "130px",
        height: "96px",
        backgroundImage: "url(/logo.png)",
        backgroundSize: "130%",
        backgroundPosition: "50% 58%",
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
      }}
    />
  );
}
