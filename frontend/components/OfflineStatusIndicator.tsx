"use client";

/**
 * OfflineStatusIndicator — #910
 *
 * Makes connectivity visible across the whole app:
 *  - While offline, a persistent notice explains what still works locally
 *    (drafts, cached pages, the offline verification tools) and what needs
 *    a connection (uploads, on-chain verification, wallet signing).
 *  - When connectivity returns, a short, polite announcement confirms that
 *    server actions are available again. It hides itself after a few seconds.
 *
 * Both states use a live region so screen-reader users hear the change.
 */

import { useEffect, useRef, useState } from "react";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const RECONNECTED_VISIBLE_MS = 4000;

export function OfflineStatusIndicator() {
  const online = useOnlineStatus();
  const wasOfflineRef = useRef(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOfflineRef.current = true;
      setShowReconnected(false);
      return;
    }
    if (!wasOfflineRef.current) return;

    wasOfflineRef.current = false;
    setShowReconnected(true);
    const timer = window.setTimeout(() => setShowReconnected(false), RECONNECTED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [online]);

  if (online && !showReconnected) {
    // Keep an empty live region mounted so later announcements are reliable.
    return <div role="status" aria-live="polite" className="sr-only" />;
  }

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="offline-status"
        className="w-full border-b border-slate-400 bg-slate-100 px-4 py-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
          <p className="font-semibold">You&apos;re offline.</p>
          <p>
            Your saved drafts and previously viewed pages are still on this device.{" "}
            <span className="font-medium">Available offline:</span> viewing and editing local
            drafts, browsing cached pages. <span className="font-medium">Needs a connection:</span>{" "}
            uploads, on-chain verification, and wallet signing. These will fail until you reconnect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="online-status"
      className="w-full border-b border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
    >
      <p className="mx-auto max-w-6xl font-medium">
        You&apos;re back online. Server actions are available again.
      </p>
    </div>
  );
}
