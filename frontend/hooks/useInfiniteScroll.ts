/**
 * useInfiniteScroll.ts
 *
 * React hook that uses the `IntersectionObserver` API to detect when a
 * sentinel element enters the viewport so the caller can load the next
 * page of data.
 *
 * Usage
 * -----
 * Attach `sentinelRef` to a `<div>` at the bottom of your list.  When
 * that element becomes visible, `isIntersecting` flips to `true`.  Load
 * the next page, then call `reset()` once it is loaded so the sentinel
 * is ready for the following intersection.
 *
 * @module hooks/useInfiniteScroll
 *
 * @example
 * ```tsx
 * const { sentinelRef, isIntersecting, reset } = useInfiniteScroll();
 *
 * useEffect(() => {
 *   if (isIntersecting && hasNextPage) {
 *     loadNextPage().then(reset);
 *   }
 * }, [isIntersecting]);
 *
 * return (
 *   <>
 *     {items.map(…)}
 *     <div ref={sentinelRef} />
 *   </>
 * );
 * ```
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Options for {@link useInfiniteScroll}.
 */
interface UseInfiniteScrollOptions {
  /**
   * Intersection ratio at which the observer fires.
   * `0` = fires as soon as any pixel is visible.  Default: `0.1`.
   */
  threshold?: number;
  /**
   * CSS margin around the root viewport used to expand or shrink
   * the intersection area.  Default: `"100px"` (trigger 100 px early).
   */
  rootMargin?: string;
  /**
   * When `false` the observer is not attached and `isIntersecting`
   * never becomes `true`.  Default: `true`.
   */
  enabled?: boolean;
}

/**
 * Return value of {@link useInfiniteScroll}.
 */
interface UseInfiniteScrollReturn {
  /**
   * Callback ref — assign to the sentinel `<div>` at the bottom of the list.
   *
   * @example `<div ref={sentinelRef} />`
   */
  sentinelRef: (node: HTMLDivElement | null) => void;
  /**
   * `true` when the sentinel element is inside the visible viewport.
   * Use this to trigger the next-page load.
   */
  isIntersecting: boolean;
  /**
   * Resets `isIntersecting` to `false`.  Call this after the next page
   * has loaded so the sentinel is ready for the following scroll event.
   */
  reset: () => void;
}

/**
 * Detects when a sentinel element enters the viewport so the parent
 * component can load the next page of data.
 *
 * @param options - Observer configuration.  All fields are optional.
 * @returns `{ sentinelRef, isIntersecting, reset }` — see
 *   {@link UseInfiniteScrollReturn} for field descriptions.
 */
export function useInfiniteScroll({
  threshold = 0.1,
  rootMargin = "100px",
  enabled = true,
}: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node || !enabled) return;
      sentinelRef.current = node;
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsIntersecting(entry?.isIntersecting ?? false);
        },
        { threshold, rootMargin }
      );
      observerRef.current.observe(node);
    },
    [threshold, rootMargin, enabled]
  );

  const reset = useCallback(() => {
    setIsIntersecting(false);
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { sentinelRef: setSentinelRef, isIntersecting, reset };
}
