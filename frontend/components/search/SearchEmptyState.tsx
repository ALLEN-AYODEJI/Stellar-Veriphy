"use client";

/**
 * SearchEmptyState — #912
 *
 * Explains why a result list is empty and offers the next useful action:
 *  - "no-matches": the search worked but nothing fits. Offers clearing any
 *    active filters.
 *  - "error": the search could not run (server failure or offline). Says so
 *    plainly and offers a retry, so users never mistake a failure for "no results".
 *
 * Uses role="status" for no-match results and role="alert" for failures so
 * assistive technology announces the difference.
 */

import { WifiOff } from "lucide-react";
import React from "react";

export type SearchEmptyStateProps =
  | {
      variant: "no-matches";
      hasActiveFilters: boolean;
      onClearFilters?: () => void;
      /** Human-readable scope, e.g. "certificates". */
      noun?: string;
    }
  | {
      variant: "error";
      offline: boolean;
      onRetry?: () => void;
      retrying?: boolean;
      noun?: string;
    };

const ACTION_CLASS =
  "rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50";

export function SearchEmptyState(props: SearchEmptyStateProps) {
  const noun = props.noun ?? "results";

  if (props.variant === "no-matches") {
    return (
      <div role="status" className="space-y-3 py-6">
        <p className="font-medium text-slate-100">No {noun} match your search.</p>
        <p className="text-sm text-slate-400">
          {props.hasActiveFilters
            ? "Try removing a filter or widening the date range."
            : "Try a different search term."}
        </p>
        {props.hasActiveFilters && props.onClearFilters && (
          <button type="button" onClick={props.onClearFilters} className={ACTION_CLASS}>
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  const { offline, onRetry, retrying = false } = props;
  return (
    <div role="alert" className="space-y-3 py-6">
      <p className="flex items-center gap-2 font-medium text-red-300">
        {offline && <WifiOff className="h-4 w-4" aria-hidden="true" />}
        {offline ? "You're offline." : `We couldn't load ${noun} right now.`}
      </p>
      <p className="text-sm text-slate-400">
        {offline
          ? "Search needs a connection. Reconnect and try again."
          : "This is a problem on our side, not an empty result. Try again in a moment."}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className={ACTION_CLASS}>
          {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}
