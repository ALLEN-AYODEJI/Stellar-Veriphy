"use client";

/**
 * ExpandableText.tsx — long names, descriptions and metadata values
 *
 * Shows a value truncated to `maxChars` characters with an accessible
 * "Show more" / "Show less" control. Values at or under the limit render
 * unchanged with no control, so short values stay visually identical.
 *
 * Accessibility:
 *   - The toggle is a real <button> with aria-expanded and aria-controls
 *     pointing at the text region.
 *   - The toggle's accessible name includes `label` (when given), so
 *     "Show more" reads as "Show more content hash" to screen readers.
 *   - Each toggle announces "Expanded" or "Collapsed" in a polite live
 *     region. Nothing is announced on initial render.
 *   - While collapsed only the preview is rendered; the full value appears
 *     as soon as the control is expanded. Do not wrap primary actions (copy,
 *     verify, transfer) in this component, since truncation would hide them.
 *
 * Usage:
 * ─────────────────────────────────────────────────────────────────────────────
 *   <ExpandableText text={record.manifest.contentHash} label="content hash" mono />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useId, useState } from "react";

import { cn } from "@/utils/cn";

// ---------------------------------------------------------------------------
// Pure helper (exported for tests)
// ---------------------------------------------------------------------------

export interface TruncatedText {
  /** Text to show while collapsed. */
  preview: string;
  /** True when `preview` differs from the full text. */
  isTruncated: boolean;
}

/**
 * Truncates `text` to at most `maxChars` characters, appending an ellipsis
 * when cut. Values at or under the limit are returned unchanged.
 */
export function truncateText(text: string, maxChars: number): TruncatedText {
  const limit = Number.isFinite(maxChars) ? Math.max(1, Math.floor(maxChars)) : 120;
  if (text.length <= limit) {
    return { preview: text, isTruncated: false };
  }
  // Leave room for the ellipsis so the preview never exceeds `limit`.
  const cut = Math.max(0, limit - 1);
  return { preview: `${text.slice(0, cut).trimEnd()}…`, isTruncated: true };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ExpandableTextProps {
  /** The full value to display. */
  text: string;
  /** Maximum characters shown while collapsed. Defaults to 120. */
  maxChars?: number;
  /** Human-readable name used in the toggle's accessible name. */
  label?: string;
  /** Render the value in a monospace font (hashes, IDs, addresses). */
  mono?: boolean;
  /** Start expanded. Defaults to false. */
  defaultExpanded?: boolean;
  className?: string;
}

export function ExpandableText({
  text,
  maxChars = 120,
  label,
  mono = false,
  defaultExpanded = false,
  className,
}: ExpandableTextProps) {
  const regionId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [announcement, setAnnouncement] = useState("");

  const { preview, isTruncated } = truncateText(text, maxChars);
  const valueClass = cn("break-all", mono && "font-mono text-xs");

  if (!isTruncated) {
    return <span className={cn(valueClass, className)}>{text}</span>;
  }

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      setAnnouncement(next ? "Expanded" : "Collapsed");
      return next;
    });
  };

  const suffix = label ? ` ${label}` : "";

  return (
    <span className={cn("inline-flex max-w-full flex-col items-start gap-1", className)}>
      <span id={regionId} className={valueClass}>
        {expanded ? text : preview}
      </span>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={regionId}
        className="rounded text-xs font-medium text-indigo-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
      >
        {expanded ? "Show less" : "Show more"}
        <span className="sr-only">{suffix}</span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </span>
  );
}

export default ExpandableText;
