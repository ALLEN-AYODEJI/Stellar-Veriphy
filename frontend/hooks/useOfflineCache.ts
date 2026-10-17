/**
 * useOfflineCache.ts
 *
 * Hook that bridges React Query's in-memory cache with `localStorage`
 * so that certificate and transaction data remains accessible when the
 * browser is offline.
 *
 * Strategy
 * --------
 * - On mount, any query data stored in localStorage is re-hydrated into
 *   the React Query cache so pages render instantly from persisted data.
 * - Whenever query data changes, the updated value is written to
 *   localStorage with a TTL timestamp so stale entries can be pruned.
 * - Entries older than `maxAge` (default 24 h) are purged on mount.
 *
 * @module hooks/useOfflineCache
 *
 * @example
 * ```tsx
 * // Place at the top of a page that needs offline support
 * useOfflineCache();
 * ```
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { CACHE_GC_TIME_MS } from "@/config/app";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key prefix for all persisted cache entries. */
const CACHE_KEY_PREFIX = "sv_cache_";

/**
 * How long (ms) a persisted entry is considered valid.
 * Defaults to the React Query GC time so both in-memory and on-disk
 * entries expire at the same cadence.
 */
const DEFAULT_MAX_AGE_MS = CACHE_GC_TIME_MS;

// ---------------------------------------------------------------------------
// Serialisation helpers
// ---------------------------------------------------------------------------

interface PersistedEntry {
  /** ISO 8601 timestamp when the entry was written. */
  savedAt: string;
  /** The serialised React Query cache data. */
  data: unknown;
}

/**
 * Derives a safe localStorage key from a React Query cache key array.
 *
 * @param queryKey - The React Query key array to serialise.
 * @returns A string suitable for use as a localStorage key.
 */
function toStorageKey(queryKey: readonly unknown[]): string {
  return CACHE_KEY_PREFIX + JSON.stringify(queryKey);
}

/**
 * Reads a persisted cache entry from localStorage.
 *
 * @param storageKey - The localStorage key to read.
 * @returns The parsed {@link PersistedEntry} or `null` if absent / corrupt.
 */
function readEntry(storageKey: string): PersistedEntry | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as PersistedEntry) : null;
  } catch {
    return null;
  }
}

/**
 * Writes a cache entry to localStorage.
 *
 * @param storageKey - The localStorage key to write.
 * @param data       - The data to persist.
 */
function writeEntry(storageKey: string, data: unknown): void {
  try {
    const entry: PersistedEntry = { savedAt: new Date().toISOString(), data };
    localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Silently ignore quota errors — cache persistence is best-effort.
  }
}

/**
 * Removes all persisted cache entries older than `maxAgeMs`.
 *
 * @param maxAgeMs - Maximum age in milliseconds.
 */
function pruneStaleEntries(maxAgeMs: number): void {
  try {
    const cutoff = Date.now() - maxAgeMs;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_KEY_PREFIX)) continue;

      const entry = readEntry(key);
      if (!entry || new Date(entry.savedAt).getTime() < cutoff) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Silently ignore errors.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Cache key shapes that should be persisted to localStorage.
 *
 * Add query key root arrays here to opt-in to offline persistence.
 */
const PERSISTED_KEY_ROOTS: string[][] = [
  ["certificates"],
  ["transactions"],
  ["network"],
];

/**
 * Hydrates the React Query cache from localStorage on mount and
 * writes updated cache entries back to localStorage as they change.
 *
 * @param maxAgeMs - How long persisted entries remain valid (default: `CACHE_GC_TIME_MS`).
 */
export function useOfflineCache(maxAgeMs = DEFAULT_MAX_AGE_MS) {
  const queryClient = useQueryClient();

  // ---- Hydrate from storage on mount ------------------------------------
  useEffect(() => {
    // Remove expired entries first
    pruneStaleEntries(maxAgeMs);

    // Hydrate all matching entries into the React Query cache
    const cutoff = Date.now() - maxAgeMs;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_KEY_PREFIX)) continue;

      const entry = readEntry(key);
      if (!entry || new Date(entry.savedAt).getTime() < cutoff) continue;

      try {
        const queryKey = JSON.parse(key.slice(CACHE_KEY_PREFIX.length)) as readonly unknown[];
        queryClient.setQueryData(queryKey, entry.data);
      } catch {
        // Skip malformed entries.
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Subscribe to cache changes and persist ---------------------------
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only persist "updated" events (new data arrived)
      if (event.type !== "updated") return;

      const queryKey = event.query.queryKey as readonly unknown[];

      // Only persist keys we care about
      const shouldPersist = PERSISTED_KEY_ROOTS.some((root) =>
        root.every((segment, i) => queryKey[i] === segment),
      );
      if (!shouldPersist) return;

      const data = event.query.state.data;
      if (data === undefined) return;

      writeEntry(toStorageKey(queryKey), data);
    });

    return unsubscribe;
  }, [queryClient]);
}
