"use client";

import { cn } from "@/utils/cn";

/**
 * Window event that asks {@link KeyboardShortcutsProvider} to open the
 * keyboard shortcut reference dialog.
 */
export const OPEN_SHORTCUT_HELP_EVENT = "sv:open-shortcut-help";

interface ShortcutHelpButtonProps {
  className?: string;
}

/**
 * Visible control for discovering keyboard shortcuts from anywhere in the app.
 * The same dialog is also available with Ctrl+/ (Cmd+/ on macOS).
 */
export function ShortcutHelpButton({ className }: ShortcutHelpButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SHORTCUT_HELP_EVENT))}
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts (Ctrl+/)"
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        className
      )}
    >
      <kbd
        aria-hidden="true"
        className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-900"
      >
        ?
      </kbd>
      <span className="hidden sm:inline">Shortcuts</span>
    </button>
  );
}
