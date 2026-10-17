/**
 * queryClient.tsx
 *
 * React Query provider wrapper and singleton client re-export.
 *
 * Wrap the application root with <ReactQueryProvider> to enable
 * React Query's cache throughout the component tree.
 *
 * @module lib/queryClient
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { ReactQueryProvider } from "@/lib/queryClient";
 *
 * export default function RootLayout({ children }) {
 *   return <ReactQueryProvider>{children}</ReactQueryProvider>;
 * }
 * ```
 */

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { queryClient } from "@/config/cache";

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

/**
 * Application-level React Query provider.
 *
 * Renders a single {@link QueryClientProvider} backed by the shared
 * `queryClient` singleton defined in `config/cache.ts`.
 *
 * @param props.children - Child components that will have access to the cache.
 */
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
