"use client";

/**
 * ConfirmDialog.tsx
 *
 * Reusable confirmation dialog for destructive or otherwise important actions.
 * Built on top of `Modal` for focus management, focus trapping, and Escape-to-close.
 *
 * Usage Examples:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Basic confirmation:
 *    <ConfirmDialog
 *      isOpen={isOpen}
 *      title="Discard changes?"
 *      message="Your unsaved changes will be lost."
 *      onConfirm={discard}
 *      onCancel={() => setIsOpen(false)}
 *    />
 *
 * 2. Destructive action:
 *    <ConfirmDialog
 *      isOpen={isOpen}
 *      variant="danger"
 *      title="Delete API key?"
 *      message="This action cannot be undone."
 *      confirmLabel="Delete"
 *      onConfirm={handleDelete}
 *      onCancel={() => setIsOpen(false)}
 *    />
 *
 * 3. Async confirm with a busy state:
 *    <ConfirmDialog isOpen={isOpen} isConfirming={isDeleting} title="Delete?" message="..." onConfirm={...} onCancel={...} />
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Keyboard shortcuts: Escape cancels (handled by Modal), Enter confirms unless
 * focus is already on a button/link (native activation is left to the browser).
 */

import { AlertTriangle } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";

export type ConfirmDialogVariant = "default" | "danger";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  /** Shows a busy confirm button and blocks re-submission while true. */
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isConfirming = false,
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      // Let a focused button/link handle its own native activation.
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement)
        return;
      if (isConfirming) return;
      event.preventDefault();
      onConfirm();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isConfirming, onConfirm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      ariaLabel={title}
      ariaDescribedBy="confirm-dialog-message"
      {...(className ? { className } : {})}
    >
      <div className="flex gap-3">
        {variant === "danger" && (
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
        )}
        <p id="confirm-dialog-message" className="text-sm text-gray-600 dark:text-gray-300 pt-1">
          {message}
        </p>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[44px]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed",
            variant === "danger"
              ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
              : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500"
          )}
        >
          {isConfirming ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
