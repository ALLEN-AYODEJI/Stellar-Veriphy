"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProvenanceEvent } from "@stellarveriphy/shared/types";
import {
  EVENT_CATEGORY,
  EVENT_LABELS,
  relativeTime,
  shortKey,
  type EventCategory,
} from "@/lib/provenance/data";
import { DashboardEmptyState } from "./DashboardEmptyState";

const CATEGORY_STYLE: Record<EventCategory, string> = {
  verification: "bg-blue-500",
  certificate: "bg-emerald-500",
  update: "bg-violet-500",
};

const FILTERS: { key: EventCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "verification", label: "Verifications" },
  { key: "certificate", label: "Certificates" },
  { key: "update", label: "Updates" },
];

function dayLabel(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

interface RecentActivityTimelineProps {
  events: ProvenanceEvent[];
  limit?: number;
}

export function RecentActivityTimeline({ events, limit = 30 }: RecentActivityTimelineProps) {
  const [filter, setFilter] = useState<EventCategory | "all">("all");

  const groups = useMemo(() => {
    const filtered = events
      .filter((e) => filter === "all" || EVENT_CATEGORY[e.type] === filter)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    const map = new Map<string, ProvenanceEvent[]>();
    for (const e of filtered) {
      const k = dayLabel(e.timestamp);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [events, filter, limit]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent activity</h2>
        <div role="tablist" aria-label="Filter activity" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="mt-5">
          {events.length === 0 ? (
            <DashboardEmptyState
              heading="No activity yet"
              body="Your verification and certificate activity will appear here after you upload content."
              actionLabel="Upload content"
              actionHref="/creator/upload-content"
            />
          ) : (
            <DashboardEmptyState
              heading={`No ${FILTERS.find((item) => item.key === filter)?.label.toLowerCase()} activity yet`}
              body="This filter has no matching events. Choose All or try another filter to see the available activity."
              actionLabel="Show all activity"
              onAction={() => setFilter("all")}
            />
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map(([day, dayEvents]) => (
            <div key={day}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{day}</h3>
              <ol className="relative border-l border-gray-200 dark:border-gray-700">
                {dayEvents.map((e) => (
                  <li key={e.id} className="mb-3 ml-4 last:mb-0">
                    <span
                      className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ring-4 ring-white dark:ring-gray-800 ${CATEGORY_STYLE[EVENT_CATEGORY[e.type]]}`}
                      aria-hidden
                    />
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-medium">{EVENT_LABELS[e.type]}</span>{" "}
                        <Link
                          href={`/provenance/${e.certificateId}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          #{e.certificateId}
                        </Link>
                      </p>
                      <time
                        dateTime={new Date(e.timestamp * 1000).toISOString()}
                        title={new Date(e.timestamp * 1000).toLocaleString()}
                        className="shrink-0 text-xs text-gray-500 dark:text-gray-400"
                      >
                        {relativeTime(e.timestamp)}
                      </time>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-words">
                      {e.details} · by <span className="font-mono">{shortKey(e.actor)}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
