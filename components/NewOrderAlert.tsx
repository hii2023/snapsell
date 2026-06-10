"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { T } from "@/lib/db";

// Plays a short ding via the Web Audio API whenever a new order is
// inserted into snapsell_orders. Listens via Supabase realtime so it
// fires within a second of the customer hitting Book.
//
// Mounted in AdminShell so it only runs on /orders (the admin pages).
export default function NewOrderAlert() {
  const router = useRouter();
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Lazily build an AudioContext on the first user gesture, then keep it
  // around. Browsers block autoplay until the page has been interacted with.
  useEffect(() => {
    function ensureCtx() {
      if (audioCtxRef.current) return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      } catch {
        // fall back to silent
      }
    }
    window.addEventListener("pointerdown", ensureCtx, { once: true });
    window.addEventListener("keydown", ensureCtx, { once: true });
    return () => {
      window.removeEventListener("pointerdown", ensureCtx);
      window.removeEventListener("keydown", ensureCtx);
    };
  }, []);

  function ding() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // Two-tone "bell": 880Hz then 1320Hz, each ~120ms, with a soft envelope.
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.14;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel("new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: T.orders },
        () => {
          ding();
          // Refresh server data so the new order appears in the list
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [router]);

  return null;
}
