"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OrdersClient from "./OrdersClient";
import SellForm from "./SellForm";
import CameraCapture from "./CameraCapture";
import type { Order, Product } from "@/lib/types";

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

type Phase = "closed" | "camera" | "wizard";

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
  const [phase, setPhase] = useState<Phase>("closed");
  const [file, setFile] = useState<File | null>(null);
  const [added, setAdded] = useState(0);
  const [shot, setShot] = useState(0);

  function startAdd() {
    setAdded(0);
    setPhase("camera");
  }
  function onCapture(f: File) {
    setFile(f);
    setShot((n) => n + 1);
    setPhase("wizard");
  }
  function close() {
    setPhase("closed");
    setFile(null);
    setAdded(0);
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/orders" className="text-lg font-semibold">
            {shopName}
          </Link>
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>
      </header>

      <OrdersClient initialOrders={initialOrders} initialProducts={initialProducts} />

      <button
        onClick={startAdd}
        aria-label="Add a product"
        className="fixed bottom-6 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95"
      >
        <Plus className="h-8 w-8" />
      </button>

      {phase === "camera" && (
        <CameraCapture
          onCapture={onCapture}
          onClose={close}
          hint={added > 0 ? `${added} added. Snap the next product.` : "Point the camera at your product"}
        />
      )}

      {phase === "wizard" && file && (
        <div className="fixed inset-0 z-40 bg-black/40 sm:flex sm:items-center sm:justify-center">
          <div className="relative h-full w-full overflow-y-auto bg-white sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-lg sm:rounded-3xl">
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <SellForm
              key={shot}
              pricePresets={pricePresets}
              initialFile={file}
              onReshoot={() => setPhase("camera")}
              onClose={close}
              onSaved={() => setAdded((n) => n + 1)}
            />
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
