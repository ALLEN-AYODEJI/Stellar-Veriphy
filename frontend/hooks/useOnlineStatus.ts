"use client";

/**
 * useOnlineStatus — #910
 *
 * Reports the browser's connectivity as a reactive boolean. Backed by
 * `useSyncExternalStore` so every consumer stays in sync with the
 * `online` / `offline` window events without its own listeners.
 *
 * During server rendering (and before hydration) the hook reports `true`
 * so no offline UI flashes on first paint.
 */

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
