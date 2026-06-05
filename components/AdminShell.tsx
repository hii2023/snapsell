"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OrdersClient from "./OrdersClient";
import SellForm from "./SellForm";
import type { Order, Product } from "@/lib/types";

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

export default function AdminShell({
  pricePresets,
  initialOrders,
  initialProducts,
}: {
  pricePresets: number[];
  initialOrders: Order[];
  initialProducts: Product[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  function openPicker() {
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  }
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setOpen(true);
    }
  }
  function close() {
    setOpen(false);
    setFile(null);
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/orders" className="text-lg font-semibold">
            {shopName}
          </Link>
          <button
            onClick={openPicker}
            className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>
      </header>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

      <OrdersClient initialOrders={initialOrders} initialProducts={initialProducts} />

      {/* Floating + */}
      <button
        onClick={openPicker}
        aria-label="Add a product"
        className="fixed bottom-6 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95"
      >
        <Plus className="h-8 w-8" />
      </button>

      {/* Add-product modal (no dedicated page) */}
      {open && file && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:flex sm:items-center sm:justify-center"
          onClick={close}
        >
          <div
            className="relative h-full w-full overflow-y-auto bg-white sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-lg sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <SellForm pricePresets={pricePresets} initialFile={file} onClose={close} />
          </div>
        </div>
      )}
    </>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
