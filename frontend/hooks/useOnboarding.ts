"use client";

import { useCallback, useEffect, useState } from "react";

const ONBOARDING_STORAGE_KEY = "sv-onboarding-completed";

/**
 * Tracks whether the first-time onboarding flow should be shown.
 * Persists dismissal ("don't show again") to localStorage.
 */
export function useOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!completed) {
        setIsOpen(true);
      }
    } catch {
      // localStorage unavailable (SSR/private mode) — skip onboarding
    } finally {
      setIsReady(true);
    }
  }, []);

  const close = useCallback((dontShowAgain: boolean) => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      } catch {
        // ignore storage failures
      }
    }
    setIsOpen(false);
  }, []);

  const reopen = useCallback(() => {
    setIsOpen(true);
  }, []);

  return { isOpen: isReady && isOpen, close, reopen };
}
