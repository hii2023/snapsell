"use client";

import { useState } from "react";
import { SIZE_OPTIONS, CUSTOM_SIZE_CATEGORIES, CUSTOM_SIZE_UNITS } from "@/lib/constants";
import type { Category } from "@/lib/types";

// Split a stored size like "650ml" / "1.5L" into a number + unit for editing.
function parseCustom(v: string): { num: string; unit: string } | null {
  const m = v.trim().match(/^(\d+(?:\.\d+)?)\s*(ml|l|g|kg|pc|pcs)$/i);
  if (!m) return null;
  let unit = m[2].toLowerCase();
  if (unit === "l") unit = "L";
  if (unit === "pcs") unit = "pc";
  return { num: m[1], unit };
}

// Size picker shared by the add-photo flow and the manual edit form. Renders the
// preset chips, and for FMCG/food a "Custom" chip that reveals a number box +
// unit (ml / L / g / kg / pc) so any pack size can be entered.
export function SizeField({
  category,
  value,
  onChange,
  chipClass,
}: {
  category: Category;
  value: string;
  onChange: (v: string) => void;
  chipClass: (active: boolean) => string;
}) {
  const presets = SIZE_OPTIONS[category];
  const allowCustom = CUSTOM_SIZE_CATEGORIES.includes(category);
  const parsed = parseCustom(value);
  const customValue = allowCustom && value !== "" && !presets.includes(value);
  const [open, setOpen] = useState(customValue);
  const [num, setNum] = useState(parsed?.num ?? "");
  const [unit, setUnit] = useState(parsed?.unit ?? "ml");

  function commit(n: string, u: string) {
    const clean = n.trim();
    onChange(clean ? `${clean}${u}` : "");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => {
            setOpen(false);
            onChange(value === s ? "" : s);
          }}
          className={chipClass(!open && value === s)}
        >
          {s}
        </button>
      ))}

      {allowCustom && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            commit(num, unit);
          }}
          className={chipClass(open || customValue)}
        >
          Custom
        </button>
      )}

      {allowCustom && (open || customValue) && (
        <div className="mt-1 flex w-full items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 15"
            value={num}
            onChange={(e) => {
              const n = e.target.value.replace(/[^0-9.]/g, "");
              setNum(n);
              commit(n, unit);
            }}
            className="input w-28"
          />
          <select
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              commit(num, e.target.value);
            }}
            className="input w-24"
          >
            {CUSTOM_SIZE_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          {num && (
            <span className="text-sm font-medium text-neutral-500">
              = {num}
              {unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
