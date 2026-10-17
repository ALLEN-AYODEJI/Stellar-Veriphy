/**
 * useAutoSave.ts
 *
 * React hook that periodically persists form state to `localStorage` so
 * that in-progress work is not lost on accidental navigation or browser crash.
 *
 * Features
 * --------
 * - Configurable save interval (default 30 s).
 * - Restores the last saved value on demand.
 * - Tracks `hasUnsaved` state and fires a native `beforeunload` warning.
 * - Broadcasts a custom `autosave-storage` DOM event so sibling tabs
 *   can pick up the latest saved value without a page refresh.
 *
 * @module hooks/useAutoSave
 *
 * @example
 * ```tsx
 * const { state, save, restore, discard } = useAutoSave({
 *   key: "manifest-editor",
 *   data: formValues,
 *   interval: 10_000,        // save every 10 s
 *   onRestore: (v) => reset(v),
 * });
 * ```
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Default auto-save interval in milliseconds (30 seconds). */
const DEFAULT_INTERVAL = 30000;

/** Custom DOM event name used to notify sibling tabs of a save. */
const STORAGE_EVENT_KEY = "autosave-storage";

/**
 * Configuration for {@link useAutoSave}.
 *
 * @template T - The shape of the data being persisted.
 */
interface AutoSaveOptions<T> {
  /** `localStorage` key under which the data will be stored. */
  key: string;
  /** The current value to persist.  Changes trigger the "unsaved" flag. */
  data: T;
  /** Called after every successful save with the serialised value. */
  onSave?: (data: T) => void;
  /** Called when `restore()` successfully reads back a saved value. */
  onRestore?: (data: T) => void;
  /** How often (ms) to write to `localStorage`.  Default: 30 000. */
  interval?: number;
  /** Set to `false` to suspend all auto-save activity. Default: `true`. */
  enabled?: boolean;
}

/**
 * Snapshot of the current auto-save lifecycle state.
 */
interface AutoSaveState {
  /** Unix timestamp (ms) of the last successful save, or `null` if never saved. */
  lastSaved: number | null;
  /** `true` while a save write is in progress. */
  isSaving: boolean;
  /** `true` when `data` has changed since the last successful save. */
  hasUnsaved: boolean;
}

declare global {
  interface WindowEventMap {
    "autosave-storage": CustomEvent<{ key: string }>;
  }
}

/**
 * Periodically persists `data` to `localStorage` and optionally restores
 * it on demand.
 *
 * @template T - The type of the data being auto-saved.
 * @param options - Configuration; see {@link AutoSaveOptions}.
 * @returns An object containing the current {@link AutoSaveState} and
 *   imperative helpers: `save`, `restore`, `clearSaved`, `discard`.
 */
export function useAutoSave<T>({
  key,
  data,
  onSave,
  onRestore,
  interval = DEFAULT_INTERVAL,
  enabled = true,
}: AutoSaveOptions<T>) {
  const [state, setState] = useState<AutoSaveState>({
    lastSaved: null,
    isSaving: false,
    hasUnsaved: false,
  });
  const prevDataRef = useRef<T>(data);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = useCallback(
    (dataToSave: T) => {
      if (!enabled) return;
      try {
        localStorage.setItem(key, JSON.stringify(dataToSave));
        const now = Date.now();
        setState({ lastSaved: now, isSaving: false, hasUnsaved: false });
        window.dispatchEvent(new CustomEvent(STORAGE_EVENT_KEY, { detail: { key } }));
        onSave?.(dataToSave);
      } catch {
        setState((prev) => ({ ...prev, isSaving: false }));
      }
    },
    [key, enabled, onSave]
  );

  const restore = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as T;
      onRestore?.(parsed);
      setState((prev) => ({ ...prev, lastSaved: Date.now(), hasUnsaved: false }));
      return parsed;
    } catch {
      return null;
    }
  }, [key, onRestore]);

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setState({ lastSaved: null, isSaving: false, hasUnsaved: false });
    } catch {
      /* noop */
    }
  }, [key]);

  const discard = useCallback(() => {
    clearSaved();
  }, [clearSaved]);

  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsaved) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, state.hasUnsaved]);

  useEffect(() => {
    if (!enabled) return;
    const handleStorageEvent = (e: CustomEvent<{ key: string }>) => {
      if (e.detail.key === key) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as T;
            onRestore?.(parsed);
          } catch {
            /* noop */
          }
        }
      }
    };
    window.addEventListener(STORAGE_EVENT_KEY, handleStorageEvent);
    return () => window.removeEventListener(STORAGE_EVENT_KEY, handleStorageEvent);
  }, [enabled, key, onRestore]);

  useEffect(() => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, hasUnsaved: true }));
  }, [enabled, data]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, isSaving: true }));
      save(data);
    }, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval, data, save]);

  return { state, save: () => save(data), restore, clearSaved, discard };
}
