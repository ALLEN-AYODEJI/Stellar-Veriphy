"use client";

/**
 * WelcomeBanner.tsx (issue #894)
 *
 * Dismissible banner shown to newly signed-in creators that points at the
 * next recommended action (uploading their first piece of content).
 *
 * Eligibility
 * ───────────
 * • The user is authenticated with a session role of "user" (creators). Admins
 *   and moderators already know the console and are not targeted.
 * • The user has not dismissed the banner before. Dismissal is stored per
 *   account subject so it survives reloads and new sessions, and it never
 *   applies to a different account signed in on the same browser.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/context/AuthSessionContext";

export const WELCOME_BANNER_STORAGE_PREFIX = "sv-welcome-banner-dismissed:";
export const WELCOME_BANNER_CTA_HREF = "/creator/upload-content";

function dismissalKey(subject: string): string {
  return `${WELCOME_BANNER_STORAGE_PREFIX}${subject}`;
}

function readDismissed(subject: string): boolean {
  try {
    return window.localStorage.getItem(dismissalKey(subject)) === "true";
  } catch {
    // Storage unavailable (private mode, blocked site data): show the banner.
    return false;
  }
}

function writeDismissed(subject: string): void {
  try {
    window.localStorage.setItem(dismissalKey(subject), "true");
  } catch {
    // Ignore storage failures; the banner hides for this render regardless.
  }
}

export function WelcomeBanner() {
  const { hydrated, isAuthenticated, session } = useAuthSession();
  const subject = session?.subject ?? null;
  // null = not yet read from storage (avoids an SSR/hydration mismatch).
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !subject) {
      setDismissed(null);
      return;
    }
    setDismissed(readDismissed(subject));
  }, [hydrated, isAuthenticated, subject]);

  const eligible =
    hydrated &&
    isAuthenticated &&
    subject !== null &&
    session?.role === "user" &&
    dismissed === false;

  if (!eligible) return null;

  const handleDismiss = () => {
    if (subject) writeDismissed(subject);
    setDismissed(true);
  };

  return (
    <section
      aria-labelledby="welcome-banner-title"
      className="border-b border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-50"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="welcome-banner-title" className="text-sm font-semibold">
            Welcome to StellarVeriphy
          </h2>
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            Your next step: upload your first piece of content to create a verifiable record.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={WELCOME_BANNER_CTA_HREF}
            className="inline-flex min-h-9 items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Upload content
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss welcome message"
            className="inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-200 dark:hover:bg-indigo-900"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}

export default WelcomeBanner;
