"use client";

import { useState } from "react";
import ProductEdit from "./ProductEdit";
import type { Product } from "@/lib/types";

export default function SellerBar({
  product,
  subcats,
}: {
  product?: Product;
  subcats: Record<string, string[]>;
}) {
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  return (
    <>
      {/* Floating seller toolbar */}
      <div className="fixed bottom-5 right-4 z-30 flex flex-col items-end gap-2">
        {product && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg active:scale-95"
          >
            <PencilIcon className="h-4 w-4" />
            Edit product
          </button>
        )}
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          Add product
        </button>
      </div>

      {editing && product && (
        <ProductEdit
          product={product}
          subcats={subcats}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); window.location.reload(); }}
          onDeleted={() => { setEditing(false); window.location.href = "/"; }}
        />
      )}

      {creating && (
        <ProductEdit
          subcats={subcats}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); window.location.reload(); }}
          onDeleted={() => setCreating(false)}
        />
      )}
    </>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
