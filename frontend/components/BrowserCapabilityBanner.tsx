"use client";

/**
 * BrowserCapabilityBanner.tsx (issue #848, copy revised for #897)
 *
 * Site-wide notice that names the browser features this app cannot use and
 * suggests what to do about it.
 *
 * Copy rules
 * ──────────
 * • The primary message names what is affected in plain language and gives one
 *   or more recommended actions.
 * • Technical names (for example "crypto.subtle") appear only inside a
 *   collapsed "Technical details" section, for support and debugging.
 * • Required capabilities are announced as an alert and cannot be dismissed.
 *   Optional ones can be dismissed for the rest of the browser session.
 */

import { useEffect, useState } from "react";

import {
  type CapabilityCheck,
  detectCapabilities,
  REQUIRED_CAPABILITIES,
} from "@/config/environment";

const DISMISS_KEY = "sv_browser_capability_banner_dismissed";

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "true");
  } catch {
    // Storage unavailable: the banner will reappear on the next render.
  }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function BrowserCapabilityBanner() {
  const [missing, setMissing] = useState<CapabilityCheck[] | null>(null);
  const [requiredMissing, setRequiredMissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const report = detectCapabilities();
    setMissing(report.missing);
    setRequiredMissing(
      report.missing.some((check) => REQUIRED_CAPABILITIES.includes(check.capability))
    );
    setDismissed(readDismissed());
  }, []);

  if (!missing || missing.length === 0) return null;
  if (dismissed && !requiredMissing) return null;

  const names = missing.map((check) => check.name);
  const headline = requiredMissing
    ? "This browser isn't fully supported"
    : "Some features aren't available in this browser";

  // Recommended actions, one per distinct guidance message, in capability order.
  const actions = Array.from(new Set(missing.map((check) => check.guidance)));

  const handleDismiss = () => {
    writeDismissed();
    setDismissed(true);
  };

  return (
    <section
      role={requiredMissing ? "alert" : "region"}
      aria-labelledby="browser-capability-title"
      className="border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-50"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 id="browser-capability-title" className="text-sm font-semibold">
              {headline}
            </h2>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              We can&apos;t provide {joinNames(names)} in this browser. The rest of the app still works.
            </p>
          </div>
          {requiredMissing ? null : (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss browser compatibility notice"
              className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-100 dark:hover:bg-amber-900"
            >
              Dismiss
            </button>
          )}
        </div>

        <div className="text-sm">
          <p className="font-medium">What you can do:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>

        <details className="text-xs text-amber-800 dark:text-amber-200">
          <summary className="cursor-pointer select-none">Technical details</summary>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((check) => (
              <li key={check.capability}>{check.label}</li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}

export default BrowserCapabilityBanner;
