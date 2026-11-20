import {
  ANONYMOUS_FILTER_SCOPE,
  filterMemoryKey,
  type FilterStorage,
  forgetRememberedFilters,
  hasActiveFilters,
  loadRememberedFilters,
  rememberFilters,
  sanitizeRememberedFilters,
} from "../certificateFilterMemory";

function memoryStorage(): FilterStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("certificateFilterMemory (#896)", () => {
  it("round-trips active filters for an account scope", () => {
    const storage = memoryStorage();
    rememberFilters("GACCOUNT_A", { status: "Active", creator: "GCREATOR", offset: 20 }, storage);

    expect(loadRememberedFilters("GACCOUNT_A", storage)).toEqual({
      status: "Active",
      creator: "GCREATOR",
    });
  });

  it("never returns one account's filters to another account", () => {
    const storage = memoryStorage();
    rememberFilters("GACCOUNT_A", { status: "Revoked" }, storage);

    expect(loadRememberedFilters("GACCOUNT_B", storage)).toBeNull();
    expect(loadRememberedFilters(null, storage)).toBeNull();
  });

  it("keeps anonymous visitors in their own bucket", () => {
    expect(filterMemoryKey(null)).toBe(`sv_certificate_filter_memory:${ANONYMOUS_FILTER_SCOPE}`);
    expect(filterMemoryKey("")).toBe(filterMemoryKey(undefined));
    expect(filterMemoryKey("GACCOUNT_A")).not.toBe(filterMemoryKey(null));
  });

  it("clears the stored entry when filters are reset to defaults", () => {
    const storage = memoryStorage();
    rememberFilters("GACCOUNT_A", { status: "Locked" }, storage);
    rememberFilters("GACCOUNT_A", { offset: 0, limit: 10 }, storage);

    expect(storage.data.has(filterMemoryKey("GACCOUNT_A"))).toBe(false);
  });

  it("forgets remembered filters on request", () => {
    const storage = memoryStorage();
    rememberFilters("GACCOUNT_A", { status: "Expired" }, storage);
    forgetRememberedFilters("GACCOUNT_A", storage);

    expect(loadRememberedFilters("GACCOUNT_A", storage)).toBeNull();
  });

  it("ignores corrupt or unexpected stored values", () => {
    const storage = memoryStorage();
    const key = filterMemoryKey("GACCOUNT_A");

    storage.setItem(key, "{not json");
    expect(loadRememberedFilters("GACCOUNT_A", storage)).toBeNull();

    storage.setItem(key, JSON.stringify(["status", "Active"]));
    expect(loadRememberedFilters("GACCOUNT_A", storage)).toBeNull();
  });

  it("drops fields with the wrong type or unknown names", () => {
    expect(
      sanitizeRememberedFilters({
        status: 42,
        creator: "GCREATOR",
        startTime: "yesterday",
        endTime: 1_700_000_000,
        injected: "<script>",
        offset: 500,
      })
    ).toEqual({ creator: "GCREATOR", endTime: 1_700_000_000 });
  });

  it("rejects oversized strings and non-finite numbers", () => {
    expect(sanitizeRememberedFilters({ creator: "x".repeat(257) })).toBeNull();
    expect(sanitizeRememberedFilters({ startTime: Number.NaN })).toBeNull();
  });

  it("does not treat pagination alone as an active filter", () => {
    expect(hasActiveFilters({ offset: 30, limit: 10 })).toBe(false);
    expect(hasActiveFilters({ offset: 0, limit: 10, contentType: "image" })).toBe(true);
  });

  it("is a no-op when storage is unavailable", () => {
    expect(() => rememberFilters("GACCOUNT_A", { status: "Active" }, null)).not.toThrow();
    expect(loadRememberedFilters("GACCOUNT_A", null)).toBeNull();
  });
});
