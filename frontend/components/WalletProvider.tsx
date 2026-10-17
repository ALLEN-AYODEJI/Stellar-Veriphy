"use client";

/**
 * WalletProvider.tsx
 *
 * Thin provider shim that initialises the Zustand wallet store on mount.
 * The full wallet state is now managed in `@/store/useWalletStore` — this
 * component simply calls `store.init()` once so that the persisted session
 * (localStorage) is restored when the app boots.
 *
 * Consuming components should import directly from the store:
 *
 *   import { useWallet }        from "@/store/useWalletStore"; // full state
 *   import { useWalletActions } from "@/store/useWalletStore"; // actions only
 *   import { useWalletPublicKey } from "@/store/useWalletStore"; // single slice
 *
 * The legacy `useWallet` export from this file is kept for backward
 * compatibility — it re-exports from the store.
 */

import { useEffect } from "react";

import { useWalletStore } from "@/store/useWalletStore";

export { useWallet } from "@/store/useWalletStore";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const init = useWalletStore((s) => s.init);

  useEffect(() => {
    void init();
    // init is stable (created once by Zustand) — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This provider is purely for side-effects — it renders no extra DOM nodes.
  return <>{children}</>;
}
