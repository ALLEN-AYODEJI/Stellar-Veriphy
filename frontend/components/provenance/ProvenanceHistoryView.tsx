"use client";

import type {
  ProvenanceEvent,
  ProvenanceEventType,
  ProvenanceRecord,
} from "@stellarveriphy/shared/types";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EVENT_CATEGORY, EVENT_LABELS, type EventCategory, shortKey } from "@/lib/provenance/data";

/** Events that change who owns or what is certified, highlighted in the timeline. */
const IMPORTANT_EVENTS: ReadonlySet<ProvenanceEventType> = new Set<ProvenanceEventType>([
  "certificate_minted",
  "ownership_transferred",
  "certificate_revoked",
  "verification_failed",
]);

const DOT: Record<EventCategory, string> = {
  verification: "bg-blue-500",
  certificate: "bg-emerald-500",
  update: "bg-violet-500",
};

const CATEGORY_LABEL: Record<EventCategory, string> = {
  verification: "Verification",
  certificate: "Certificate",
  update: "Update",
};

const STATUS_BADGE: Record<ProvenanceRecord["status"], string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  revoked: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  expired: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

/** Compact gap between two events, e.g. "+5m", "+3h", "+2d". */
function formatGap(seconds: number): string {
  if (seconds < 3600) return `+${Math.max(1, Math.round(seconds / 60))}m`;
  if (seconds < 86_400) return `+${Math.round(seconds / 3600)}h`;
  return `+${Math.round(seconds / 86_400)}d`;
}

function dayKey(timestamp: number): string {
  return new Date(timestamp * 1000).toDateString();
}

function dayLabel(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ProvenanceHistoryViewProps {
  record: ProvenanceRecord;
  events: ProvenanceEvent[]; // any order; sorted oldest first here
}

interface TimelineEntry {
  event: ProvenanceEvent;
  /** 1-based position in the full, sorted history. */
  position: number;
  /** Seconds since the previous event in the full history, if any. */
  gapSeconds: number | null;
}

const COLLAPSED = 8;

export function ProvenanceHistoryView({ record, events }: ProvenanceHistoryViewProps) {
  const [expanded, setExpanded] = useState(false);

  const entries: TimelineEntry[] = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.map((event, i) => ({
      event,
      position: i + 1,
      gapSeconds: i > 0 ? event.timestamp - sorted[i - 1].timestamp : null,
    }));
  }, [events]);

  const visible = expanded || entries.length <= COLLAPSED ? entries : entries.slice(0, COLLAPSED);

  // Group visible entries by calendar day, preserving chronological order.
  const groups = useMemo(() => {
    const result: { key: string; timestamp: number; items: TimelineEntry[] }[] = [];
    for (const entry of visible) {
      const key = dayKey(entry.event.timestamp);
      const last = result[result.length - 1];
      if (last && last.key === key) {
        last.items.push(entry);
      } else {
        result.push({ key, timestamp: entry.event.timestamp, items: [entry] });
      }
    }
    return result;
  }, [visible]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4">
      <header className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Certificate #{record.id}
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[record.status]}`}
          >
            {record.status}
          </span>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["Asset", record.fileName ?? "—"],
            ["Current owner", record.creator],
            ["Content hash", record.contentHash],
            ["Minted", new Date(record.timestamp * 1000).toLocaleString()],
            ["Events", String(entries.length)],
            ["Last change", new Date(record.lastEventAt * 1000).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
              <dd className="truncate font-mono text-gray-900 dark:text-gray-100" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="history-heading">
        <h2
          id="history-heading"
          className="mb-4 text-lg font-semibold text-gray-900 dark:text-white"
        >
          Provenance timeline
        </h2>

        {groups.map((group) => (
          <section
            key={group.key}
            aria-label={dayLabel(group.timestamp)}
            className="mb-5 last:mb-0"
          >
            <h3 className="sticky top-0 z-10 mb-2 bg-gray-50/95 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-gray-950/95 dark:text-gray-400">
              {dayLabel(group.timestamp)}
            </h3>
            <ol className="space-y-2">
              {group.items.map(({ event: e, position, gapSeconds }) => {
                const category = EVENT_CATEGORY[e.type];
                const important = IMPORTANT_EVENTS.has(e.type);
                const hasEvidence = Boolean(e.changes || e.txHash || e.relatedCertificateId);
                return (
                  <li
                    key={e.id}
                    className={`grid grid-cols-[auto_1fr] gap-x-3 rounded-lg border p-3 ${
                      important
                        ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex flex-col items-center pt-1.5" aria-hidden>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ring-4 ring-gray-50 dark:ring-gray-900 ${DOT[category]}`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-gray-900 dark:text-white">
                          <span className="text-xs tabular-nums text-gray-400">#{position}</span>
                          {EVENT_LABELS[e.type]}
                          {important && (
                            <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                              Key event
                            </span>
                          )}
                        </p>
                        <time
                          dateTime={new Date(e.timestamp * 1000).toISOString()}
                          className="whitespace-nowrap text-xs tabular-nums text-gray-500 dark:text-gray-400"
                        >
                          {timeLabel(e.timestamp)}
                          {gapSeconds !== null && (
                            <span className="ml-1.5 text-gray-400 dark:text-gray-500">
                              {formatGap(gapSeconds)}
                            </span>
                          )}
                        </time>
                      </div>

                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {CATEGORY_LABEL[category]} · by{" "}
                        <span className="font-mono">{shortKey(e.actor)}</span>
                      </p>

                      {e.details && (
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{e.details}</p>
                      )}

                      {hasEvidence && (
                        <details className="group mt-2 text-xs">
                          <summary className="cursor-pointer select-none rounded font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400">
                            Evidence for event #{position}
                          </summary>
                          <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3 dark:border-gray-700">
                            {e.changes && (
                              <ul className="space-y-1 font-mono text-gray-700 dark:text-gray-300">
                                {Object.entries(e.changes).map(([field, c]) => (
                                  <li key={field} className="break-all">
                                    <span className="font-semibold">{field}:</span>{" "}
                                    <span className="text-red-600 line-through dark:text-red-400">
                                      {c.from ? shortKey(c.from) : "—"}
                                    </span>
                                    {" → "}
                                    <span className="text-emerald-700 dark:text-emerald-400">
                                      {c.to ? shortKey(c.to) : "—"}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {e.txHash && (
                              <p className="text-gray-500 dark:text-gray-400">
                                Transaction <span className="break-all font-mono">{e.txHash}</span>
                              </p>
                            )}
                            {e.relatedCertificateId && (
                              <p className="text-gray-500 dark:text-gray-400">
                                Related certificate{" "}
                                <Link
                                  href={`/provenance/${e.relatedCertificateId}`}
                                  className="text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  #{e.relatedCertificateId}
                                </Link>
                              </p>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        {entries.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-4 rounded text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400"
          >
            {expanded ? "Show fewer events" : `Show all ${entries.length} events`}
          </button>
        )}
      </section>
    </div>
  );
}
