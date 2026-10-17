"use client";

/**
 * useFormPersistence.ts
 *
 * Persists form values to localStorage and restores them on mount.
 *
 * Features
 * ────────
 * • Auto-saves form values to localStorage on every change
 * • Restores persisted values on mount (opt-in via restoreOnMount)
 * • Exposes clear() to wipe persisted data (e.g. after successful submit)
 * • TTL support — persisted data expires after a configurable duration
 * • Works with any form values object (generic T)
 * • SSR-safe: reads/writes localStorage only in browser environments
 *
 * Usage
 * ─────
 *   const { restore, clear, hasPersisted } = useFormPersistence({
 *     key: "report-issue-form",
 *     values: form.values,
 *     onRestore: (saved) => form.setValues(saved),
 *   });
 *
 *   // Show a "Restore draft?" prompt when hasPersisted is true
 *   // Call clear() after a successful submit
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseFormPersistenceOptions<T> {
  /**
   * localStorage key under which the form values are stored.
   * Use a unique, stable key per form (e.g. "report-issue-form").
   */
  key: string;
  /** Current form values — watched for changes and auto-persisted. */
  values: T;
  /**
   * Called with the restored values when a saved draft is found on mount.
   * If not provided, the draft is silently available via `restore()`.
   */
  onRestore?: (values: T) => void;
  /**
   * Whether to automatically restore persisted values on mount.
   * Default: false (let the caller decide when to restore).
   */
  restoreOnMount?: boolean;
  /**
   * Time-to-live for persisted data in milliseconds.
   * After this duration the stored draft is considered stale and ignored.
   * Default: 7 days.
   */
  ttlMs?: number;
  /**
   * Whether persistence is active. Set to false to disable (e.g. after submit).
   * Default: true.
   */
  enabled?: boolean;
}

export interface UseFormPersistenceReturn<T> {
  /** True when a non-expired draft exists in localStorage for this key. */
  hasPersisted: boolean;
  /** Manually load and return the persisted draft (null if none / expired). */
  restore: () => T | null;
  /** Remove the persisted draft from localStorage. */
  clear: () => void;
  /** ISO string of when the draft was last saved, or null. */
  lastSavedAt: string | null;
}

// ---------------------------------------------------------------------------
// Internal persisted envelope
// ---------------------------------------------------------------------------

interface PersistedEnvelope<T> {
  values: T;
  savedAt: string; // ISO string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function readEnvelope<T>(key: string): PersistedEnvelope<T> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedEnvelope<T>;
  } catch {
    return null;
  }
}

function isExpired(savedAt: string, ttlMs: number): boolean {
  const age = Date.now() - new Date(savedAt).getTime();
  return age > ttlMs;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFormPersistence<T>({
  key,
  values,
  onRestore,
  restoreOnMount = false,
  ttlMs = DEFAULT_TTL_MS,
  enabled = true,
}: UseFormPersistenceOptions<T>): UseFormPersistenceReturn<T> {
  const [hasPersisted, setHasPersisted] = useState<boolean>(() => {
    const envelope = readEnvelope<T>(key);
    if (!envelope) return false;
    return !isExpired(envelope.savedAt, ttlMs);
  });

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => {
    const envelope = readEnvelope<T>(key);
    return envelope && !isExpired(envelope.savedAt, ttlMs) ? envelope.savedAt : null;
  });

  // Keep a ref to the latest values so the persist effect always writes fresh data
  const valuesRef = useRef<T>(values);
  valuesRef.current = values;

  // ── Auto-persist on values change ─────────────────────────────────────────
  useEffect(() => {
    if (!enabled || typeof localStorage === "undefined") return;
    const savedAt = new Date().toISOString();
    const envelope: PersistedEnvelope<T> = { values, savedAt };
    try {
      localStorage.setItem(key, JSON.stringify(envelope));
      setHasPersisted(true);
      setLastSavedAt(savedAt);
    } catch {
      // Storage quota exceeded or unavailable — fail silently
    }
  }, [key, values, enabled]);

  // ── Restore on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!restoreOnMount || !onRestore) return;
    const envelope = readEnvelope<T>(key);
    if (!envelope || isExpired(envelope.savedAt, ttlMs)) return;
    onRestore(envelope.values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── restore (manual) ──────────────────────────────────────────────────────
  const restore = useCallback((): T | null => {
    const envelope = readEnvelope<T>(key);
    if (!envelope || isExpired(envelope.savedAt, ttlMs)) return null;
    onRestore?.(envelope.values);
    return envelope.values;
  }, [key, ttlMs, onRestore]);

  // ── clear ─────────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
    setHasPersisted(false);
    setLastSavedAt(null);
  }, [key]);

  return { hasPersisted, restore, clear, lastSavedAt };
}

export default useFormPersistence;
