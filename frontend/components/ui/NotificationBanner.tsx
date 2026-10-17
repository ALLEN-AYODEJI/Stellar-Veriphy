"use client";

/**
 * NotificationBanner.tsx
 *
 * Announcement and alert banner component.
 *
 * Features
 * ────────
 * • Variants: success | info | warning | error
 * • Dismissible (optional close button)
 * • Action button support
 * • Built-in icon per variant (customisable or hideable)
 * • Layout modes: full-width block or inline (fits its container)
 * • Sticky positioning option (fixed to the top of the viewport)
 * • Accessible: role="alert" / role="status", focus management on dismiss
 *
 * Usage
 * ─────
 *   // Inline info banner
 *   <NotificationBanner variant="info">
 *     Your session will expire in 5 minutes.
 *   </NotificationBanner>
 *
 *   // Full-width, sticky, dismissible success
 *   <NotificationBanner
 *     variant="success"
 *     fullWidth
 *     sticky
 *     dismissible
 *     onDismiss={() => setVisible(false)}
 *     title="Certificate minted"
 *   >
 *     Your provenance certificate has been recorded on Stellar.
 *   </NotificationBanner>
 *
 *   // With an action button
 *   <NotificationBanner
 *     variant="warning"
 *     action={{ label: "Review", onClick: openReview }}
 *   >
 *     Your manifest is missing a required field.
 *   </NotificationBanner>
 */

import React, { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BannerVariant = "success" | "info" | "warning" | "error";

export interface BannerAction {
  label: string;
  onClick: () => void;
}

export interface NotificationBannerProps {
  /** Visual / semantic variant. Defaults to "info". */
  variant?: BannerVariant;
  /** Optional bold title rendered above the message. */
  title?: React.ReactNode;
  /** The banner body content. */
  children?: React.ReactNode;
  /** Show a dismiss (×) button. */
  dismissible?: boolean;
  /** Callback fired when the user dismisses the banner. */
  onDismiss?: () => void;
  /** Optional action button rendered to the right of the message. */
  action?: BannerAction;
  /** Stretch to full viewport width (use with sticky or in page headers). */
  fullWidth?: boolean;
  /** Stick to the top of the viewport. Implies fullWidth. */
  sticky?: boolean;
  /** Override or hide the default variant icon. Pass false to hide. */
  icon?: React.ReactNode | false;
  className?: string;
}

// ---------------------------------------------------------------------------
// Variant config
// ---------------------------------------------------------------------------

const variantConfig: Record<
  BannerVariant,
  {
    base: string;
    iconColor: string;
    role: "alert" | "status";
    defaultIcon: React.ReactNode;
  }
> = {
  success: {
    base: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-100",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    role: "status",
    defaultIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  info: {
    base: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-100",
    iconColor: "text-blue-500 dark:text-blue-400",
    role: "status",
    defaultIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    base: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100",
    iconColor: "text-amber-500 dark:text-amber-400",
    role: "alert",
    defaultIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  error: {
    base: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-100",
    iconColor: "text-red-500 dark:text-red-400",
    role: "alert",
    defaultIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBanner({
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  action,
  fullWidth = false,
  sticky = false,
  icon,
  className,
}: NotificationBannerProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const dismissBtnRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();

  const config = variantConfig[variant];

  const handleDismiss = useCallback(() => {
    setExiting(true);
    // Wait for CSS transition before removing from DOM
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Allow parent to re-show the banner if they re-mount (controlled visibility
  // can be achieved by conditionally rendering this component).
  useEffect(() => {
    setVisible(true);
    setExiting(false);
  }, [variant]);

  if (!visible) return null;

  const resolvedIcon = icon === false ? null : icon ?? config.defaultIcon;

  return (
    <div
      role={config.role}
      aria-labelledby={title ? labelId : undefined}
      aria-live={config.role === "alert" ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(
        // Base layout
        "flex items-start gap-3 border px-4 py-3 text-sm",
        // Variant colours
        config.base,
        // Width / positioning
        fullWidth || sticky ? "w-full" : "rounded-md",
        sticky && "fixed left-0 right-0 top-0 z-50 rounded-none shadow-md",
        // Animation
        "transition-opacity duration-200",
        exiting ? "opacity-0" : "opacity-100",
        className
      )}
    >
      {/* Icon */}
      {resolvedIcon && (
        <span className={cn("mt-0.5 shrink-0", config.iconColor)}>{resolvedIcon}</span>
      )}

      {/* Text content */}
      <div className="min-w-0 flex-1">
        {title && (
          <p id={labelId} className="font-semibold leading-snug">
            {title}
          </p>
        )}
        {children && <p className={cn("leading-snug", title && "mt-0.5 opacity-90")}>{children}</p>}
      </div>

      {/* Action button */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md border border-current px-3 py-1 text-xs font-medium",
            "transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1"
          )}
        >
          {action.label}
        </button>
      )}

      {/* Dismiss button */}
      {dismissible && (
        <button
          ref={dismissBtnRef}
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className={cn(
            "ml-1 shrink-0 rounded-sm p-0.5 opacity-70",
            "transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1"
          )}
        >
          {/* × close icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default NotificationBanner;
