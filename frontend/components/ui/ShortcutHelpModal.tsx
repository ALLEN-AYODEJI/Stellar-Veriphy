"use client";

import { useMemo } from "react";

import { Modal } from "@/components/ui/Modal";
import { type ShortcutAction } from "@/hooks/useKeyboardShortcuts";

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutAction[];
  /** Returns human-readable alternatives for an action, e.g. `["Ctrl+K"]`. */
  getDisplayKeys: (action: ShortcutAction) => string[];
}

/**
 * Lists every registered keyboard shortcut, grouped by category.
 *
 * Each action's alternatives (for example `Ctrl+?` and `Ctrl+/`) are shown as
 * separate key chips joined by "or", so a combination is never read as a
 * chord of its own.
 */
export function ShortcutHelpModal({
  isOpen,
  onClose,
  shortcuts,
  getDisplayKeys,
}: ShortcutHelpModalProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, ShortcutAction[]> = {};
    for (const s of shortcuts) {
      if (!groups[s.category]) groups[s.category] = [];
      (groups[s.category] as ShortcutAction[]).push(s);
    }
    return groups;
  }, [shortcuts]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, actions]) => (
          <section key={category} aria-label={category}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              {category}
            </h3>
            <ul className="space-y-1">
              {actions.map((action) => (
                <li
                  key={action.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-1.5"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">{action.label}</span>
                  <span className="flex flex-wrap items-center gap-1">
                    {getDisplayKeys(action).map((key, i) => (
                      <span key={key} className="inline-flex items-center gap-1">
                        {i > 0 && <span className="text-gray-400 text-xs">or</span>}
                        <kbd className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded whitespace-nowrap">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
          These shortcuts work on every page. Press Esc to close this dialog.
        </p>
      </div>
    </Modal>
  );
}
