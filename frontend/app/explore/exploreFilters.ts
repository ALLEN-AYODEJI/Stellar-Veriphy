/**
 * exploreFilters.ts — filter scope and status counts for the explore list (#907)
 *
 * Status chip counts must describe the records a user can actually reach with
 * the current filters. A count is therefore computed over the records that match
 * every filter EXCEPT the status filter. Selecting a chip then shows exactly the
 * number of records that chip reports.
 *
 * Example: with time range "7d" and query "invoice", the "Verified" count is the
 * number of verified invoices from the last 7 days, not the number of verified
 * records in the whole dataset.
 */

import type { VerificationRecord } from "@stellarveriphy/shared/types";

import {
  type AssetStatusFilter,
  matchesAssetStatusFilter,
} from "@/components/AssetStatusFilterChips";

export type ExploreTimeRange = "all" | "24h" | "7d" | "30d";

export interface ExploreScopeFilters {
  timeRange: ExploreTimeRange;
  assetType: string;
  query: string;
}

export const STATUS_FILTER_KEYS: readonly AssetStatusFilter[] = [
  "all",
  "verified",
  "pending",
  "unverified",
  "disputed",
  "archived",
] as const;

const TIME_WINDOW_MS: Record<Exclude<ExploreTimeRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Returns true when a record's timestamp falls within the chosen time window. */
export function matchesTimeRange(
  record: VerificationRecord,
  range: ExploreTimeRange,
  now: number = Date.now()
): boolean {
  if (range === "all") return true;
  const ts = new Date(record.manifest.timestamp).getTime();
  return ts >= now - TIME_WINDOW_MS[range];
}

/** Returns true when a record's mediaType matches the chosen asset type. */
export function matchesAssetType(record: VerificationRecord, assetType: string): boolean {
  if (assetType === "all") return true;
  return record.mediaType?.toLowerCase() === assetType;
}

/** Returns true when a record matches the free-text query (title, id, type, creator). */
export function matchesQuery(record: VerificationRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [record.title, record.id, record.mediaType, record.manifest.creator]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Records that match every filter except the status filter. This is the scope
 * that status chip counts are computed over.
 */
export function filterScopeRecords(
  records: VerificationRecord[],
  scope: ExploreScopeFilters,
  now: number = Date.now()
): VerificationRecord[] {
  return records.filter(
    (r) =>
      matchesTimeRange(r, scope.timeRange, now) &&
      matchesAssetType(r, scope.assetType) &&
      matchesQuery(r, scope.query)
  );
}

/**
 * Counts per status chip over the scoped records. Every key is always present so
 * chips show "0" rather than disappearing when a bucket is empty.
 */
export function computeStatusCounts(
  scopeRecords: VerificationRecord[]
): Record<AssetStatusFilter, number> {
  const counts = Object.fromEntries(STATUS_FILTER_KEYS.map((k) => [k, 0])) as Record<
    AssetStatusFilter,
    number
  >;
  counts.all = scopeRecords.length;
  for (const r of scopeRecords) {
    for (const key of STATUS_FILTER_KEYS) {
      if (key !== "all" && matchesAssetStatusFilter(r.status, key)) counts[key] += 1;
    }
  }
  return counts;
}
