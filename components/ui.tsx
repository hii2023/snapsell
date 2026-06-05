"use client";

import React from "react";

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${active ? "chip-on" : "chip-off"}`}
    >
      {children}
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 9999,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-12 w-12 rounded-full border border-neutral-300 bg-white text-2xl font-semibold active:scale-95"
      >
        -
      </button>
      <span className="w-12 text-center text-2xl font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-12 w-12 rounded-full border border-neutral-300 bg-white text-2xl font-semibold active:scale-95"
      >
        +
      </button>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-neutral-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-brand" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
