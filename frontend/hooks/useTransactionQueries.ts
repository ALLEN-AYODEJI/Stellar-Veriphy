/**
 * useTransactionQueries.ts
 *
 * React Query hooks for transaction history and statistics.
 *
 * Wraps the `transactionService` with per-domain TTLs from
 * `config/cache.ts` so all transaction reads are cached and
 * UI components stay free of fetch logic.
 *
 * @module hooks/useTransactionQueries
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTransactionHistory(address);
 * ```
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys, STALE_TIMES } from "@/config/cache";
import {
  fetchTransactionById,
  fetchTransactionHistory,
  getTransactionStats,
} from "@/services/transactionService";
import type {
  TransactionFilters,
  TransactionPaginationOptions,
} from "@/types/transaction.types";

// ---------------------------------------------------------------------------
// Transaction history
// ---------------------------------------------------------------------------

/**
 * Fetches paginated transaction history for a wallet address.
 *
 * @param address    - The Stellar wallet public key (`G...`).
 * @param filters    - Optional type / status / date filters.
 * @param pagination - Optional page / limit controls.
 * @returns React Query result containing {@link TransactionListResponse}.
 */
export function useTransactionHistory(
  address: string | null | undefined,
  filters?: TransactionFilters,
  pagination?: TransactionPaginationOptions,
) {
  const page = pagination?.page;
  return useQuery({
    queryKey: queryKeys.transactions.history(address ?? "", filters, page),
    queryFn: () => fetchTransactionHistory(address!, filters, pagination),
    enabled: Boolean(address),
    staleTime: STALE_TIMES.txHistory,
  });
}

// ---------------------------------------------------------------------------
// Single transaction detail
// ---------------------------------------------------------------------------

/**
 * Fetches a single transaction by its Stellar transaction hash.
 *
 * @param hash - The full Stellar transaction hash string.
 *   Pass `null` or `undefined` to disable the query.
 * @returns React Query result containing a {@link Transaction} or `null`.
 */
export function useTransactionDetail(hash: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(hash ?? ""),
    queryFn: () => fetchTransactionById(hash!),
    enabled: Boolean(hash),
    staleTime: STALE_TIMES.txHistory,
  });
}

// ---------------------------------------------------------------------------
// Transaction statistics
// ---------------------------------------------------------------------------

/**
 * Fetches aggregate transaction statistics for a wallet address.
 *
 * Statistics include total counts, breakdowns by type and status, and
 * a count of transactions in the last 30 days.
 *
 * @param address - The Stellar wallet public key (`G...`).
 * @returns React Query result containing the stats object.
 */
export function useTransactionStats(address: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions.stats(address ?? ""),
    queryFn: () => getTransactionStats(address!),
    enabled: Boolean(address),
    staleTime: STALE_TIMES.txHistory,
  });
}

// ---------------------------------------------------------------------------
// Manual invalidation helpers
// ---------------------------------------------------------------------------

/**
 * Returns helpers for manually invalidating transaction cache entries.
 *
 * Call these after submitting a transaction so the history list refreshes
 * without waiting for the TTL to expire.
 *
 * @example
 * ```ts
 * const { invalidateHistory } = useTransactionInvalidation();
 * // After submitting a transaction, refresh the history
 * await invalidateHistory(walletAddress);
 * ```
 */
export function useTransactionInvalidation() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidates paginated history for a specific address.
     *
     * @param address - Wallet address whose history should be refreshed.
     */
    invalidateHistory: (address: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.history(address),
      }),

    /**
     * Invalidates aggregate stats for a specific address.
     *
     * @param address - Wallet address whose stats should be refreshed.
     */
    invalidateStats: (address: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.stats(address),
      }),

    /**
     * Invalidates all transaction cache entries across all addresses.
     */
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
  };
}
