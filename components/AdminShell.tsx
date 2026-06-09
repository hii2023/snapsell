"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import OrdersClient from "./OrdersClient";
import SellForm from "./SellForm";
import CameraCapture from "./CameraCapture";
import LogoLink from "./LogoLink";
import type { Order, Product, Settings } from "@/lib/types";

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

type Phase = "closed" | "camera" | "wizard";

export default function AdminShell({
  settings,
  initialOrders,
  initialProducts,
}: {
  settings: Settings;
  initialOrders: Order[];
  initialProducts: Product[];
}) {
  const pricePresets = settings.price_presets;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("closed");
  const [queue, setQueue] = useState<File[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [added, setAdded] = useState(0);
  const [shot, setShot] = useState(0);
  const [batch, setBatch] = useState(false); // persists until the seller unticks it

  function startAdd() {
    setAdded(0);
    setPhase("camera");
  }
  function onCapture(files: File[]) {
    setQueue(files);
    setQIndex(0);
    setShot((n) => n + 1);
    setPhase("wizard");
  }
  // Move to the next queued photo; returns false when the queue is finished.
  function advance() {
    if (qIndex + 1 < queue.length) {
      setQIndex((i) => i + 1);
      return true;
    }
    return false;
  }
  function reshoot() {
    setQueue([]);
    setQIndex(0);
    setPhase("camera");
  }
  function close() {
    setPhase("closed");
    setQueue([]);
    setQIndex(0);
    setAdded(0);
    router.refresh();
  }

  const current = queue[qIndex];

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <LogoLink />
          <div className="flex items-center gap-2">
            <a
              href="https://store.indiarecycles.org"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              View store
            </a>
            <button
              onClick={startAdd}
              className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      </header>

      <OrdersClient initialOrders={initialOrders} initialProducts={initialProducts} settings={settings} />

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
          hint={
            added > 0
              ? `${added} added. Snap or pick the next product(s).`
              : "Take a photo, or open gallery to pick several at once"
          }
        />
      )}

      <AnimatePresence>
        {phase === "wizard" && current && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 sm:flex sm:items-center sm:justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="relative h-full w-full overflow-y-auto bg-white sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-lg sm:rounded-3xl"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {queue.length > 1 && (
                <div className="absolute left-4 top-4 z-10 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                  Photo {qIndex + 1} of {queue.length}
                </div>
              )}
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
                key={`${shot}-${qIndex}`}
                pricePresets={pricePresets}
                initialFile={current}
                onReshoot={reshoot}
                onClose={close}
                onSaved={() => setAdded((n) => n + 1)}
                onAdvance={advance}
                addedTotal={added}
                batch={batch}
                onBatchChange={setBatch}
                subcats={settings.subcats}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
