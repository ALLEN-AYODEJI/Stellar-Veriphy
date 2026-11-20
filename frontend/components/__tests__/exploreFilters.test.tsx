import type { VerificationRecord } from "@stellarveriphy/shared/types";

import {
  computeStatusCounts,
  type ExploreScopeFilters,
  filterScopeRecords,
} from "@/app/explore/exploreFilters";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function record(
  id: string,
  status: string,
  daysAgo: number,
  mediaType = "image",
  title = `Asset ${id}`
): VerificationRecord {
  return {
    id,
    title,
    status,
    mediaType,
    manifest: {
      timestamp: new Date(NOW - daysAgo * DAY).toISOString(),
      creator: `GCREATOR${id}`,
      contentHash: `hash-${id}`,
    },
  } as unknown as VerificationRecord;
}

const ALL_SCOPE: ExploreScopeFilters = { timeRange: "all", assetType: "all", query: "" };

const RECORDS: VerificationRecord[] = [
  record("1", "verified", 1, "image", "Invoice January"),
  record("2", "verified", 40, "image", "Invoice February"),
  record("3", "pending", 2, "video", "Clip one"),
  record("4", "unverified", 3, "image", "Invoice March"),
  record("5", "disputed", 5, "video", "Clip two"),
  record("6", "archived", 60, "image", "Old scan"),
];

describe("filterScopeRecords", () => {
  it("applies time, type and query filters", () => {
    const ids = filterScopeRecords(
      RECORDS,
      { timeRange: "7d", assetType: "image", query: "invoice" },
      NOW
    ).map((r) => r.id);
    expect(ids).toEqual(["1", "4"]);
  });

  it("returns everything for the all-scope", () => {
    expect(filterScopeRecords(RECORDS, ALL_SCOPE, NOW)).toHaveLength(RECORDS.length);
  });

  it("matches the query against the creator address too", () => {
    const ids = filterScopeRecords(RECORDS, { ...ALL_SCOPE, query: "gcreator6" }, NOW).map(
      (r) => r.id
    );
    expect(ids).toEqual(["6"]);
  });
});

describe("computeStatusCounts", () => {
  it("counts every status bucket, including zeros", () => {
    const counts = computeStatusCounts([]);
    expect(counts).toEqual({
      all: 0,
      verified: 0,
      pending: 0,
      unverified: 0,
      disputed: 0,
      archived: 0,
    });
  });

  it("counts statuses over the records passed in", () => {
    const counts = computeStatusCounts(RECORDS);
    expect(counts.all).toBe(6);
    expect(counts.verified).toBe(2);
    expect(counts.pending).toBe(1);
    expect(counts.unverified).toBe(1);
    expect(counts.disputed).toBe(1);
    expect(counts.archived).toBe(1);
  });

  it("makes each chip count equal the rows selecting it would show", () => {
    // Scope: 7-day window and "image" type. Counts come from this scope, so
    // selecting "Verified" must show exactly the count reported for it.
    const scope = filterScopeRecords(
      RECORDS,
      { timeRange: "7d", assetType: "image", query: "" },
      NOW
    );
    const counts = computeStatusCounts(scope);
    expect(counts.all).toBe(scope.length);
    expect(counts.verified).toBe(1);
    expect(counts.verified).toBe(scope.filter((r) => r.status === "verified").length);
  });

  it("does not count records outside the scope", () => {
    const scope = filterScopeRecords(RECORDS, { ...ALL_SCOPE, timeRange: "24h" }, NOW);
    const counts = computeStatusCounts(scope);
    expect(counts.all).toBe(1);
    expect(counts.archived).toBe(0);
  });
});
