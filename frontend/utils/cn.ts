/**
 * cn.ts
 *
 * Utility for merging Tailwind CSS class names safely.
 *
 * Combines `clsx` (conditional class joining) with `tailwind-merge`
 * (conflict resolution) so that callers can pass any mix of static
 * strings, objects, and arrays without worrying about duplicate or
 * conflicting Tailwind utilities.
 *
 * @module utils/cn
 *
 * @example
 * ```ts
 * cn("px-4 py-2", isActive && "bg-blue-600", "text-white")
 * // → "px-4 py-2 bg-blue-600 text-white"  (when isActive is true)
 *
 * cn("text-red-500", "text-blue-500")
 * // → "text-blue-500"  (tailwind-merge keeps the last conflicting class)
 * ```
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names, resolving conflicts via `tailwind-merge`.
 *
 * @param inputs - Any combination of strings, arrays, or objects accepted
 *   by `clsx`.  Falsy values are ignored.
 * @returns A single, deduplicated class string with Tailwind conflicts resolved.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
