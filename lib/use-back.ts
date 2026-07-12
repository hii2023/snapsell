"use client";

import { useEffect, useRef } from "react";

// Ties a state-driven view (full-screen step, admin tab, or modal) to browser
// history so the phone / browser Back button closes it instead of leaving the
// site. While `open` is true one history entry is pushed; pressing Back pops
// it and calls onBack. Closing from the UI consumes the entry silently, so
// the next Back press behaves normally. Multiple hooks can be active at once
// (e.g. a tab plus a modal on top); each entry carries its own key so only
// the hook whose entry was popped fires.
export function useBackClose(open: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;

  useEffect(() => {
    if (!open) return;
    const key = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    // Spread the existing state so Next.js router internals are preserved.
    window.history.pushState({ ...window.history.state, __view: key }, "");
    let fired = false;

    function onPop() {
      // If our key is still the current state, a deeper entry was popped —
      // not ours, so ignore.
      if (window.history.state?.__view === key) return;
      fired = true;
      cb.current();
    }

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed from the UI while our entry is still on top — consume it so
      // the user does not need to press Back twice afterwards.
      if (!fired && window.history.state?.__view === key) {
        window.history.back();
      }
    };
  }, [open]);
}
