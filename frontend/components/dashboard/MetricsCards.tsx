"use client";

import { DashboardWidgetSkeleton } from "@/components/ui/Skeleton";
import type { DashboardMetrics } from "@/lib/provenance/data";

interface MetricsCardsProps {
  metrics: DashboardMetrics | null;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8 text-blue-500 dark:text-blue-400" preserveAspectRatio="none" aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  if (!metrics) {
    return (
      <div className="space-y-4">
        {/* Stat cards — 4 columns match the loaded layout */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardWidgetSkeleton key={i} />
          ))}
        </div>
        {/* Sparkline / chart row — fixed height matches the loaded widget */}
        <div
          className="h-[88px] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"
          role="status"
          aria-label="Loading chart"
        >
          <span className="sr-only">Loading chart…</span>
        </div>
      </div>
    );
  }

  const delta = metrics.verifications24h - metrics.verificationsPrev24h;

  // Cards are ordered by priority for creator workflows:
  //  1. Verification throughput  — the primary activity metric creators act on
  //  2. Verification success rate — immediate quality signal
  //  3. Certificates issued       — cumulative output; context for the above two
  //  4. Avg. verification time    — operational detail; useful but secondary
  const cards = [
    {
      label: "Verification throughput",
      value: metrics.verifications24h.toLocaleString(),
      unit: "per 24 h",
      hint: `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} vs previous 24 h`,
      hintClass: delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
    },
    {
      label: "Verification success rate",
      value: metrics.successRate.toFixed(1),
      unit: "%",
      hint: "completed ÷ (completed + failed)",
    },
    {
      label: "Certificates issued",
      value: metrics.totalCertificates.toLocaleString(),
      unit: "total",
      hint: `${metrics.activeCertificates.toLocaleString()} active`,
    },
    {
      label: "Avg. verification time",
      value: formatDuration(metrics.avgVerificationSeconds),
      unit: "submit → attested",
      hint: "across all verifications",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{c.label}</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tabular-nums text-gray-900 dark:text-white">{c.value}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{c.unit}</span>
            </p>
            <p className={`mt-1 text-xs ${c.hintClass ?? "text-gray-500 dark:text-gray-400"}`}>{c.hint}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completed verifications · last 14 days</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {metrics.dailyVerifications.reduce((a, b) => a + b, 0)} total
          </p>
        </div>
        <Sparkline values={metrics.dailyVerifications} />
      </div>
    </div>
  );
}
