"use client";

/**
 * Certificate Explorer (issue #464)
 *
 * Advanced filtering interface for certificates: multiple filter criteria,
 * date range, status, creator, saved presets, and export of filtered
 * results.
 */

import { useEffect, useState } from "react";

import { CertificateFilterPanel } from "@/components/certificates/CertificateFilterPanel";
import {
  type CertificateStatus,
  CertificateStatusBadge,
} from "@/components/certificates/CertificateStatusBadge";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCertificateSearch } from "@/hooks/useCertificateQueries";
import {
  forgetRememberedFilters,
  hasActiveFilters,
  loadRememberedFilters,
  rememberFilters,
} from "@/lib/certificateFilterMemory";
import type { CertificateSearchFilters } from "@/services/certificateVerificationService";
import { useWalletPublicKey } from "@/store/useWalletStore";

const PAGE_SIZE = 10;
const TABLE_COLUMNS = ["ID", "Creator", "Status", "Level", "Date"];

/** Dark-themed row skeleton matching this page's table, shown while the search resolves. */
function CertificateTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading certificates">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-800 text-slate-400">
          <tr>
            {TABLE_COLUMNS.map((col) => (
              <th key={col} className="px-3 py-2">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-slate-800/70">
              {TABLE_COLUMNS.map((col) => (
                <td key={col} className="px-3 py-3">
                  <Skeleton className="h-4 w-full bg-slate-800" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(value: string, chars = 10): string {
  if (value.length <= chars * 2 + 3) return value;
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
}

function toCsv(rows: { id: string; creator: string; timestamp: number }[]): string {
  const header = "id,creator,timestamp,date";
  const lines = rows.map(
    (row) => `${row.id},${row.creator},${row.timestamp},${formatDate(row.timestamp)}`
  );
  return [header, ...lines].join("\n");
}

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const DEFAULT_FILTERS: CertificateSearchFilters = { offset: 0, limit: PAGE_SIZE };

export default function CertificatesPage() {
  // Filters are remembered per connected account (or anonymous visitor).
  const scope = useWalletPublicKey();
  const [filters, setFiltersState] = useState<CertificateSearchFilters>(DEFAULT_FILTERS);
  const [restored, setRestored] = useState(false);

  // Restore after mount so server and client render the same first pass.
  useEffect(() => {
    const remembered = loadRememberedFilters(scope);
    if (remembered) {
      setFiltersState({ ...remembered, offset: 0, limit: PAGE_SIZE });
      setRestored(true);
    } else {
      setFiltersState(DEFAULT_FILTERS);
      setRestored(false);
    }
  }, [scope]);

  // Only user-initiated changes are written, so switching accounts never
  // overwrites another account's remembered filters.
  const setFilters = (
    update: CertificateSearchFilters | ((prev: CertificateSearchFilters) => CertificateSearchFilters)
  ) => {
    const next = typeof update === "function" ? update(filters) : update;
    setFiltersState(next);
    setRestored(false);
    rememberFilters(scope, next);
  };

  const clearRememberedFilters = () => {
    forgetRememberedFilters(scope);
    setFiltersState(DEFAULT_FILTERS);
    setRestored(false);
  };

  const { data, isLoading, isError } = useCertificateSearch(filters);
  const result = data?.success ? data.data : undefined;
  const certificates = result?.certificates ?? [];
  const total = result?.total ?? 0;
  const offset = filters.offset ?? 0;

  const exportResults = (format: "json" | "csv") => {
    if (format === "json") {
      download(
        `certificates-export-${Date.now()}.json`,
        JSON.stringify(certificates, null, 2),
        "application/json"
      );
    } else {
      download(`certificates-export-${Date.now()}.csv`, toCsv(certificates), "text/csv");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Header />
      <div className="mx-auto max-w-6xl px-6">
        <Breadcrumbs variant="dark" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold">Certificate Explorer</h1>
          <p className="max-w-3xl text-lg text-slate-300">
            Filter certificates by status, creator, verification level, and date range. Save filter
            combinations as presets and export matching results.
          </p>
        </div>

        {restored || hasActiveFilters(filters) ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300"
          >
            <span>
              {restored
                ? "Showing filters you applied earlier in this session."
                : "Filters are remembered for this session."}
            </span>
            {hasActiveFilters(filters) ? (
              <button
                type="button"
                onClick={clearRememberedFilters}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Clear remembered filters
              </button>
            ) : null}
          </div>
        ) : null}

        <CertificateFilterPanel filters={filters} onChange={setFilters} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-400">
              {total} certificate{total === 1 ? "" : "s"} match{total === 1 ? "es" : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportResults("json")}
                disabled={certificates.length === 0}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => exportResults("csv")}
                disabled={certificates.length === 0}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          {isLoading && <CertificateTableSkeleton />}
          {isError && <p className="text-red-400">Failed to load certificates.</p>}

          {!isLoading && certificates.length === 0 && (
            <p className="text-slate-400">No certificates match the current filters.</p>
          )}

          {certificates.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Creator</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Level</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="border-b border-slate-800/70 text-slate-200">
                      <td className="px-3 py-2 font-mono">{cert.id}</td>
                      <td className="px-3 py-2 font-mono">{truncate(cert.creator)}</td>
                      <td className="px-3 py-2">
                        <CertificateStatusBadge
                          status={(cert.statusLabel ?? "Active") as CertificateStatus}
                          size="sm"
                          showIcon={false}
                        />
                      </td>
                      <td className="px-3 py-2">{cert.verificationLevel ?? "Standard"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(cert.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() =>
                  setFilters((f) => ({ ...f, offset: Math.max(0, offset - PAGE_SIZE) }))
                }
                className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setFilters((f) => ({ ...f, offset: offset + PAGE_SIZE }))}
                className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
