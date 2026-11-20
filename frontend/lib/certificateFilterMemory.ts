/**
 * certificateFilterMemory.ts (issue #896)
 *
 * Remembers the active certificate-explorer filters so they are restored when
 * a user navigates away and returns.
 *
 * Scope and privacy
 * ─────────────────
 * • Stored in sessionStorage, so memory lives only for the current browser tab
 *   session and is not kept across browser restarts.
 * • Keyed by account scope (the connected wallet address), so filters from one
 *   account never appear for another account, and an anonymous visitor has its
 *   own separate bucket.
 * • Only known filter fields are read back, so malformed or tampered storage
 *   cannot inject unexpected query parameters.
 * • Default (empty) filters are not stored; "clear" removes the entry entirely.
 */

import type { CertificateSearchFilters } from "@/services/certificateVerificationService";

const KEY_PREFIX = "sv_certificate_filter_memory:";
export const ANONYMOUS_FILTER_SCOPE = "anonymous";

/** Filter fields that users control. Pagination is not remembered. */
const REMEMBERED_STRING_FIELDS = [
  "creator",
  "verificationLevel",
  "status",
  "contentType",
] as const;
const REMEMBERED_NUMBER_FIELDS = ["startTime", "endTime"] as const;

export interface FilterStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): FilterStorage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    // Accessing sessionStorage can throw when site data is blocked.
    return null;
  }
}

export function filterMemoryKey(scope: string | null | undefined): string {
  return `${KEY_PREFIX}${scope && scope.length > 0 ? scope : ANONYMOUS_FILTER_SCOPE}`;
}

/** True when no user-controlled filter is set (pagination is ignored). */
export function hasActiveFilters(filters: CertificateSearchFilters): boolean {
  const stringActive = REMEMBERED_STRING_FIELDS.some((field) => {
    const value = filters[field];
    return typeof value === "string" && value.length > 0;
  });
  const numberActive = REMEMBERED_NUMBER_FIELDS.some((field) => typeof filters[field] === "number");
  return stringActive || numberActive;
}

/** Keeps only the user-controlled fields with valid types. */
export function sanitizeRememberedFilters(value: unknown): CertificateSearchFilters | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result: CertificateSearchFilters = {};

  for (const field of REMEMBERED_STRING_FIELDS) {
    const candidate = source[field];
    if (typeof candidate === "string" && candidate.length > 0 && candidate.length <= 256) {
      result[field] = candidate;
    }
  }
  for (const field of REMEMBERED_NUMBER_FIELDS) {
    const candidate = source[field];
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      result[field] = candidate;
    }
  }

  return hasActiveFilters(result) ? result : null;
}

/** Returns the remembered user filters for a scope, or null when none are stored. */
export function loadRememberedFilters(
  scope: string | null | undefined,
  storage: FilterStorage | null = defaultStorage()
): CertificateSearchFilters | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(filterMemoryKey(scope));
    if (!raw) return null;
    return sanitizeRememberedFilters(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Stores the user filters for a scope. Empty filters clear the stored entry. */
export function rememberFilters(
  scope: string | null | undefined,
  filters: CertificateSearchFilters,
  storage: FilterStorage | null = defaultStorage()
): void {
  if (!storage) return;
  try {
    const key = filterMemoryKey(scope);
    if (!hasActiveFilters(filters)) {
      storage.removeItem(key);
      return;
    }
    storage.setItem(key, JSON.stringify(sanitizeRememberedFilters(filters)));
  } catch {
    // Storage full or unavailable: filters still apply for this view.
  }
}

/** Removes remembered filters for a scope. */
export function forgetRememberedFilters(
  scope: string | null | undefined,
  storage: FilterStorage | null = defaultStorage()
): void {
  if (!storage) return;
  try {
    storage.removeItem(filterMemoryKey(scope));
  } catch {
    // Ignore storage failures.
  }
}
