"use client";

/**
 * VerificationBadge.tsx
 *
 * Attractive certificate badge showing verification status.
 *
 * Features:
 * - Multiple badge styles: "shield" | "stamp" | "ribbon"
 * - Verification level indicators: "basic" | "standard" | "premium"
 * - Animated on hover (scale + glow via CSS)
 * - Downloadable as SVG or PNG
 * - Embeddable (copies an <iframe> snippet)
 * - Responsive (sm / md / lg sizes)
 */

import React, { useCallback, useRef } from "react";

import type { CertificateStatus } from "./CertificateStatusBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeStyle = "shield" | "stamp" | "ribbon";
export type VerificationLevel = "basic" | "standard" | "premium";
export type BadgeSize = "sm" | "md" | "lg";

export interface VerificationBadgeProps {
  status: CertificateStatus;
  level?: VerificationLevel;
  style?: BadgeStyle;
  size?: BadgeSize;
  certId?: string;
  /** Base URL used in the embeddable iframe src (defaults to window.location.origin). */
  embedBaseUrl?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<CertificateStatus, { fill: string; stroke: string; text: string }> = {
  Active:  { fill: "#d1fae5", stroke: "#059669", text: "#065f46" },
  Revoked: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  Expired: { fill: "#fef3c7", stroke: "#d97706", text: "#78350f" },
  Locked:  { fill: "#ede9fe", stroke: "#7c3aed", text: "#4c1d95" },
  Pending: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" },
  Failed:  { fill: "#ffe4e6", stroke: "#e11d48", text: "#881337" },
};

const LEVEL_STARS: Record<VerificationLevel, number> = {
  basic: 1,
  standard: 2,
  premium: 3,
};

const LEVEL_LABEL: Record<VerificationLevel, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

const SIZE_PX: Record<BadgeSize, { w: number; h: number }> = {
  sm: { w: 120, h: 140 },
  md: { w: 160, h: 185 },
  lg: { w: 200, h: 230 },
};

// ---------------------------------------------------------------------------
// SVG builders
// ---------------------------------------------------------------------------

function buildShieldSvg(
  status: CertificateStatus,
  level: VerificationLevel,
  size: BadgeSize,
  certId?: string
): string {
  const { w, h } = SIZE_PX[size];
  const c = STATUS_COLOR[status];
  const stars = "★".repeat(LEVEL_STARS[level]) + "☆".repeat(3 - LEVEL_STARS[level]);
  const fontSize = size === "sm" ? 9 : size === "md" ? 11 : 13;
  const iconSize = size === "sm" ? 18 : size === "md" ? 24 : 30;
  const cx = w / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="StellarVeriphy ${status} certificate — ${LEVEL_LABEL[level]} level">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Shield path -->
  <path d="M${cx},4 L${w - 8},${h * 0.28} L${w - 8},${h * 0.58} Q${cx},${h - 4} ${8},${h * 0.58} L${8},${h * 0.28} Z"
        fill="${c.fill}" stroke="${c.stroke}" stroke-width="2.5" filter="url(#glow)"/>
  <!-- Star rating -->
  <text x="${cx}" y="${h * 0.22}" text-anchor="middle" font-size="${fontSize + 2}" fill="${c.stroke}">${stars}</text>
  <!-- Status icon -->
  <text x="${cx}" y="${h * 0.52}" text-anchor="middle" font-size="${iconSize}" fill="${c.stroke}">${statusIcon(status)}</text>
  <!-- Status label -->
  <text x="${cx}" y="${h * 0.68}" text-anchor="middle" font-size="${fontSize + 1}" font-weight="bold" fill="${c.text}" font-family="system-ui,sans-serif">${status}</text>
  <!-- Level label -->
  <text x="${cx}" y="${h * 0.78}" text-anchor="middle" font-size="${fontSize}" fill="${c.text}" font-family="system-ui,sans-serif">${LEVEL_LABEL[level]}</text>
  <!-- Brand -->
  <text x="${cx}" y="${h * 0.88}" text-anchor="middle" font-size="${fontSize - 1}" fill="${c.stroke}" font-family="system-ui,sans-serif">StellarVeriphy</text>
  ${certId ? `<text x="${cx}" y="${h * 0.95}" text-anchor="middle" font-size="${fontSize - 2}" fill="${c.text}" font-family="monospace" opacity="0.7">${certId.slice(0, 12)}…</text>` : ""}
</svg>`;
}

function buildStampSvg(
  status: CertificateStatus,
  level: VerificationLevel,
  size: BadgeSize,
  certId?: string
): string {
  const { w } = SIZE_PX[size];
  const h = w; // square stamp
  const c = STATUS_COLOR[status];
  const r = w / 2 - 6;
  const cx = w / 2;
  const cy = h / 2;
  const fontSize = size === "sm" ? 9 : size === "md" ? 11 : 13;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="StellarVeriphy ${status} stamp — ${LEVEL_LABEL[level]} level">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="3" stroke-dasharray="6 3"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 8}" fill="none" stroke="${c.stroke}" stroke-width="1" opacity="0.4"/>
  <text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="${fontSize + 4}" fill="${c.stroke}">${statusIcon(status)}</text>
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${fontSize + 1}" font-weight="bold" fill="${c.text}" font-family="system-ui,sans-serif">${status}</text>
  <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="${fontSize}" fill="${c.text}" font-family="system-ui,sans-serif">${LEVEL_LABEL[level]}</text>
  <text x="${cx}" y="${cy + 27}" text-anchor="middle" font-size="${fontSize - 1}" fill="${c.stroke}" font-family="system-ui,sans-serif">StellarVeriphy</text>
  ${certId ? `<text x="${cx}" y="${cy + 37}" text-anchor="middle" font-size="${fontSize - 2}" fill="${c.text}" font-family="monospace" opacity="0.7">${certId.slice(0, 10)}…</text>` : ""}
</svg>`;
}

function buildRibbonSvg(
  status: CertificateStatus,
  level: VerificationLevel,
  size: BadgeSize,
  certId?: string
): string {
  const { w } = SIZE_PX[size];
  const h = Math.round(w * 0.55);
  const c = STATUS_COLOR[status];
  const fontSize = size === "sm" ? 8 : size === "md" ? 10 : 12;
  const cx = w / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="StellarVeriphy ${status} ribbon — ${LEVEL_LABEL[level]} level">
  <!-- Ribbon body -->
  <path d="M0,0 L${w},0 L${w},${h - 12} L${cx},${h} L0,${h - 12} Z" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>
  <!-- Content -->
  <text x="${cx}" y="${h * 0.35}" text-anchor="middle" font-size="${fontSize + 2}" fill="${c.stroke}">${statusIcon(status)} ${status}</text>
  <text x="${cx}" y="${h * 0.6}" text-anchor="middle" font-size="${fontSize}" fill="${c.text}" font-family="system-ui,sans-serif">${LEVEL_LABEL[level]} · StellarVeriphy</text>
  ${certId ? `<text x="${cx}" y="${h * 0.82}" text-anchor="middle" font-size="${fontSize - 1}" fill="${c.text}" font-family="monospace" opacity="0.7">${certId.slice(0, 14)}…</text>` : ""}
</svg>`;
}

function statusIcon(status: CertificateStatus): string {
  const icons: Record<CertificateStatus, string> = {
    Active: "✓", Revoked: "✕", Expired: "⚠", Locked: "🔒", Pending: "○", Failed: "!!",
  };
  return icons[status];
}

function buildSvg(
  style: BadgeStyle,
  status: CertificateStatus,
  level: VerificationLevel,
  size: BadgeSize,
  certId?: string
): string {
  if (style === "stamp") return buildStampSvg(status, level, size, certId);
  if (style === "ribbon") return buildRibbonSvg(status, level, size, certId);
  return buildShieldSvg(status, level, size, certId);
}

// ---------------------------------------------------------------------------
// Download helpers
// ---------------------------------------------------------------------------

function downloadSvg(svgString: string, filename: string) {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPng(svgString: string, filename: string, w: number, h: number) {
  const img = new Image();
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  img.src = url;
  await new Promise<void>((res) => { img.onload = () => res(); });
  const canvas = document.createElement("canvas");
  canvas.width = w * 2; // 2× for retina
  canvas.height = h * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  canvas.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = filename;
    a.click();
  }, "image/png");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VerificationBadge({
  status,
  level = "standard",
  style = "shield",
  size = "md",
  certId,
  embedBaseUrl,
  className = "",
}: VerificationBadgeProps) {
  const svgRef = useRef<HTMLDivElement>(null);
  const { w, h } = style === "stamp"
    ? { w: SIZE_PX[size].w, h: SIZE_PX[size].w }
    : style === "ribbon"
    ? { w: SIZE_PX[size].w, h: Math.round(SIZE_PX[size].w * 0.55) }
    : SIZE_PX[size];

  const svgString = buildSvg(style, status, level, size, certId);

  const handleDownloadSvg = useCallback(() => {
    downloadSvg(svgString, `stellarveriphy-badge-${status.toLowerCase()}.svg`);
  }, [svgString, status]);

  const handleDownloadPng = useCallback(() => {
    downloadPng(svgString, `stellarveriphy-badge-${status.toLowerCase()}.png`, w, h);
  }, [svgString, status, w, h]);

  const handleCopyEmbed = useCallback(() => {
    const base = embedBaseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    const src = certId ? `${base}/verify?cert=${certId}` : base;
    const snippet = `<iframe src="${src}" width="${w}" height="${h}" frameborder="0" title="StellarVeriphy Certificate"></iframe>`;
    navigator.clipboard.writeText(snippet).catch(() => {});
  }, [embedBaseUrl, certId, w, h]);

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      {/* Badge SVG — hover animation via Tailwind group */}
      <div
        ref={svgRef}
        className="group cursor-pointer transition-transform duration-200 ease-out hover:scale-105 focus-within:scale-105"
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}
        aria-label={`${status} verification badge`}
        role="img"
        tabIndex={0}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />

      {/* Action buttons */}
      <div className="flex gap-1.5" role="group" aria-label="Badge actions">
        <button
          onClick={handleDownloadSvg}
          className="rounded px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-800"
          aria-label="Download badge as SVG"
        >
          SVG
        </button>
        <button
          onClick={handleDownloadPng}
          className="rounded px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-800"
          aria-label="Download badge as PNG"
        >
          PNG
        </button>
        <button
          onClick={handleCopyEmbed}
          className="rounded px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-800"
          aria-label="Copy embeddable iframe snippet"
        >
          Embed
        </button>
      </div>
    </div>
  );
}

export default VerificationBadge;
