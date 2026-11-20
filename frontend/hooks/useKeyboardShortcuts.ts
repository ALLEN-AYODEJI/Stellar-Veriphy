"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export interface ShortcutAction {
  id: string;
  label: string;
  keys: string[];
  macKeys?: string[];
  handler: () => void;
  category: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutAction[];
  enabled?: boolean;
}

const STORAGE_KEY = "sv-keyboard-shortcuts";

const MODIFIER_LABELS: Record<string, string> = {
  ctrl: "Ctrl",
  control: "Ctrl",
  cmd: "⌘",
  meta: "⌘",
  shift: "Shift",
  alt: "Alt",
  option: "Alt",
};

const KEY_LABELS: Record<string, string> = {
  escape: "Esc",
  esc: "Esc",
  enter: "Enter",
  space: "Space",
  " ": "Space",
};

/**
 * Formats a stored key combo (e.g. `"ctrl+shift+h"`) for display as `"Ctrl+Shift+H"`.
 */
export function formatShortcut(combo: string): string {
  const parts = combo.toLowerCase().split("+").filter(Boolean);
  const key = parts.pop() ?? "";
  const modifiers = parts.map((p) => MODIFIER_LABELS[p] ?? p);
  const keyLabel = KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key);
  return [...modifiers, keyLabel].join("+");
}

function getDefaultShortcuts(): Record<string, string[]> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* noop */
  }
  return {};
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const customBindingsRef = useRef<Record<string, string[]>>(getDefaultShortcuts());
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const getEffectiveKeys = useCallback((action: ShortcutAction): string[] => {
    const custom = customBindingsRef.current[action.id];
    if (custom && custom.length > 0) return custom;
    if (typeof navigator !== "undefined" && navigator.platform?.includes("Mac")) {
      return action.macKeys || action.keys;
    }
    return action.keys;
  }, []);

  const updateCustomBinding = useCallback((actionId: string, newKeys: string[]) => {
    customBindingsRef.current[actionId] = newKeys;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customBindingsRef.current));
    } catch {
      /* noop */
    }
  }, []);

  const resetCustomBindings = useCallback(() => {
    customBindingsRef.current = {};
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      for (const action of shortcutsRef.current) {
        const effectiveKeys = getEffectiveKeys(action);
        const match = effectiveKeys.some((keyCombo) => {
          const parts = keyCombo.toLowerCase().split("+");
          const hasCtrl = parts.includes("ctrl") || parts.includes("control");
          const hasCmd = parts.includes("cmd") || parts.includes("meta");
          const hasShift = parts.includes("shift");
          const hasAlt = parts.includes("alt");
          const key = parts[parts.length - 1] || "";
          if (!key) return false;

          const ctrlOrCmd =
            (hasCtrl && (e.ctrlKey || e.metaKey)) || (hasCmd && (e.metaKey || e.ctrlKey));

          if (hasCtrl || hasCmd) {
            if (!ctrlOrCmd) return false;
          } else if (e.ctrlKey || e.metaKey) {
            return false;
          }

          if (hasShift && !e.shiftKey) return false;
          if (hasAlt && !e.altKey) return false;

          const targetKey = key.length === 1 ? key : key === "escape" ? "Escape" : key;
          return e.key.toLowerCase() === targetKey.toLowerCase();
        });

        if (match) {
          if (action.preventDefault !== false) {
            e.preventDefault();
            e.stopPropagation();
          }
          action.handler();
          return;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, getEffectiveKeys]);

  return useMemo(
    () => ({
      getEffectiveKeys,
      updateCustomBinding,
      resetCustomBindings,
      /**
       * Human-readable alternatives for an action, e.g. `["Ctrl+K"]`.
       * Alias pairs such as `ctrl+k` / `control+k` collapse into one entry.
       */
      getDisplayKeys: (action: ShortcutAction): string[] => {
        return Array.from(new Set(getEffectiveKeys(action).map(formatShortcut)));
      },
    }),
    [getEffectiveKeys, updateCustomBinding, resetCustomBindings]
  );
}
