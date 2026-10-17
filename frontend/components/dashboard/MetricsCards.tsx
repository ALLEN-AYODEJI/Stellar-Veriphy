"use client";

import type { DashboardMetrics } from "@/lib/provenance/data";
import Link from "next/link";
import { DashboardEmptyState } from "./DashboardEmptyState";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  const hasVerificationData = metrics.dailyVerifications.some((count) => count > 0) || metrics.verifications24h > 0 || metrics.verificationsPrev24h > 0;
  const delta = metrics.verifications24h - metrics.verificationsPrev24h;
  const cards = [
    {
      label: "Certificates issued",
      value: metrics.totalCertificates > 0 ? metrics.totalCertificates.toLocaleString() : "—",
      unit: "total",
      hint: metrics.totalCertificates > 0 ? `${metrics.activeCertificates.toLocaleString()} active` : "Upload content to issue your first certificate.",
      actionHref: metrics.totalCertificates > 0 ? undefined : "/creator/upload-content",
      actionLabel: metrics.totalCertificates > 0 ? undefined : "Upload content",
    },
    {
      label: "Verification throughput",
      value: hasVerificationData ? metrics.verifications24h.toLocaleString() : "—",
      unit: "per 24 h",
      hint: hasVerificationData ? `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} vs previous 24 h` : "Submit content to start processing verifications.",
      hintClass: delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
      actionHref: hasVerificationData ? undefined : "/creator/upload-content",
      actionLabel: hasVerificationData ? undefined : "Upload content",
    },
    {
      label: "Verification success rate",
      value: hasVerificationData ? metrics.successRate.toFixed(1) : "—",
      unit: "%",
      hint: hasVerificationData ? "completed ÷ (completed + failed)" : "Submit content to calculate a success rate.",
      actionHref: hasVerificationData ? undefined : "/creator/upload-content",
      actionLabel: hasVerificationData ? undefined : "Upload content",
    },
    {
      label: "Avg. verification time",
      value: hasVerificationData ? formatDuration(metrics.avgVerificationSeconds) : "—",
      unit: "submit → attested",
      hint: hasVerificationData ? "across all verifications" : "Complete a verification to measure processing time.",
      actionHref: hasVerificationData ? undefined : "/creator/upload-content",
      actionLabel: hasVerificationData ? undefined : "Upload content",
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
            {c.actionHref && c.actionLabel && (
              <Link href={c.actionHref} className="mt-3 inline-flex min-h-11 items-center text-xs font-medium text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-400">
                {c.actionLabel} →
              </Link>
            )}
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
        {hasVerificationData ? (
          <Sparkline values={metrics.dailyVerifications} />
        ) : (
          <DashboardEmptyState
            heading="No verification history yet"
            body="This chart stays empty until a verification is submitted and completed."
            actionLabel="Upload content"
            actionHref="/creator/upload-content"
          />
        )}
      </div>
    </div>
  );
}
