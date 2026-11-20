/**
 * useAutoSave.ts
 *
 * React hook that periodically persists form state to `localStorage` so
 * that in-progress work is not lost on accidental navigation or browser crash.
 *
 * Features
 * --------
 * - Configurable save interval (default 30 s). Only writes while there are
 *   unsaved changes.
 * - Restores the last saved value on demand.
 * - Tracks `hasUnsaved` by comparing the serialised form data against the
 *   last saved (or restored) snapshot, so re-renders with identical content
 *   do not mark the form as dirty.
 * - Warns consistently on reload/close (`beforeunload`) and on in-app link
 *   navigation while `hasUnsaved` is true.
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

/** Message shown before an in-app navigation that would discard unsaved changes. */
const UNSAVED_NAVIGATION_MESSAGE = "You have unsaved changes. Leave this page anyway?";

/**
 * Configuration for {@link useAutoSave}.
 *
 * @template T - The shape of the data being persisted.
 */
interface AutoSaveOptions<T> {
  /** `localStorage` key under which the data will be stored. */
  key: string;
  /** The current value to persist.  Content changes trigger the "unsaved" flag. */
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
  /** `true` when `data` differs from the last saved (or restored) content. */
  hasUnsaved: boolean;
}

declare global {
  interface WindowEventMap {
    "autosave-storage": CustomEvent<{ key: string }>;
  }
}

/**
 * Serialises a value for content comparison. Returns `null` when the value
 * cannot be serialised, which is treated as "changed" by callers.
 */
function serialize(value: unknown): string | null {
  try {
    return JSON.stringify(value) ?? null;
  } catch {
    return null;
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

  // Latest data, read by timers and handlers without re-subscribing them.
  const dataRef = useRef<T>(data);
  dataRef.current = data;

  // Serialised snapshot of the content that is currently persisted (or was
  // accepted as the baseline on mount / restore / clear). Dirty = differs.
  const baselineRef = useRef<string | null>(serialize(data));

  // The exact string this hook last wrote, used to ignore our own
  // same-window `autosave-storage` broadcasts.
  const lastWrittenRef = useRef<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDirty = useCallback(() => serialize(dataRef.current) !== baselineRef.current, []);

  const save = useCallback(
    (dataToSave: T) => {
      if (!enabled) return;
      const serialized = serialize(dataToSave);
      try {
        if (serialized === null) throw new Error("Data is not serialisable");
        localStorage.setItem(key, serialized);
        lastWrittenRef.current = serialized;
        baselineRef.current = serialized;
        // Report dirty against the latest data, which may have changed while
        // the write was in flight.
        setState({
          lastSaved: Date.now(),
          isSaving: false,
          hasUnsaved: isDirty(),
        });
        window.dispatchEvent(new CustomEvent(STORAGE_EVENT_KEY, { detail: { key } }));
        onSave?.(dataToSave);
      } catch {
        setState((prev) => ({ ...prev, isSaving: false }));
      }
    },
    [key, enabled, onSave, isDirty]
  );

  const restore = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as T;
      baselineRef.current = serialize(parsed) ?? stored;
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
      // The current content is now the accepted baseline; nothing is pending.
      baselineRef.current = serialize(dataRef.current);
      lastWrittenRef.current = null;
      setState({ lastSaved: null, isSaving: false, hasUnsaved: false });
    } catch {
      /* noop */
    }
  }, [key]);

  const discard = useCallback(() => {
    clearSaved();
  }, [clearSaved]);

  // Native reload / tab-close warning.
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

  // In-app navigation warning: intercept plain left-clicks on internal links
  // that leave the current URL, mirroring the reload warning above.
  useEffect(() => {
    if (!enabled || !state.hasUnsaved) return;
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null | undefined;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return; // same page (including hash-only links)
      }
      if (!window.confirm(UNSAVED_NAVIGATION_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [enabled, state.hasUnsaved]);

  // Sibling-tab sync. Our own writes are skipped because they already match
  // the form content.
  useEffect(() => {
    if (!enabled) return;
    const handleStorageEvent = (e: CustomEvent<{ key: string }>) => {
      if (e.detail.key !== key) return;
      let stored: string | null;
      try {
        stored = localStorage.getItem(key);
      } catch {
        return;
      }
      if (!stored || stored === lastWrittenRef.current) return;
      try {
        const parsed = JSON.parse(stored) as T;
        baselineRef.current = serialize(parsed) ?? stored;
        onRestore?.(parsed);
      } catch {
        /* noop */
      }
    };
    window.addEventListener(STORAGE_EVENT_KEY, handleStorageEvent);
    return () => window.removeEventListener(STORAGE_EVENT_KEY, handleStorageEvent);
  }, [enabled, key, onRestore]);

  // Recompute the dirty flag whenever the content changes.
  useEffect(() => {
    if (!enabled) return;
    const dirty = isDirty();
    setState((prev) => (prev.hasUnsaved === dirty ? prev : { ...prev, hasUnsaved: dirty }));
  }, [enabled, data, isDirty]);

  // Periodic persistence, only while there is something to save.
  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isDirty()) return;
      setState((prev) => ({ ...prev, isSaving: true }));
      save(dataRef.current);
    }, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval, save, isDirty]);

  return { state, save: () => save(dataRef.current), restore, clearSaved, discard };
}
