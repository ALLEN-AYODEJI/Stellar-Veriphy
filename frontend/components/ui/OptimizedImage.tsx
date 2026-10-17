/**
 * OptimizedImage.tsx
 *
 * Drop-in wrapper around Next.js `<Image>` that applies best-practice
 * defaults for all images in the StellarVeriphy UI.
 *
 * Features
 * --------
 * - Lazy loading via Next.js Image (automatic by default, priority flag for
 *   above-the-fold images).
 * - Blur placeholder using the project-wide SVG data-URI from `config/app.ts`
 *   to prevent layout shift while the real image loads.
 * - AVIF / WebP format negotiation (configured in `next.config.ts`).
 * - Graceful error fallback rendered inline so broken asset URLs never
 *   produce a blank white box.
 * - Full ARIA support: alt text is required; decorative images should pass
 *   `alt=""` explicitly.
 *
 * @module components/ui/OptimizedImage
 *
 * @example
 * ```tsx
 * // Responsive hero image (fills its container)
 * <OptimizedImage
 *   src="ipfs://QmXoypiz..."
 *   alt="Content thumbnail"
 *   fill
 *   className="object-cover"
 *   priority
 * />
 *
 * // Fixed-size certificate thumbnail
 * <OptimizedImage
 *   src={cert.storageRef}
 *   alt={`Certificate ${cert.id} preview`}
 *   width={256}
 *   height={256}
 * />
 * ```
 */

"use client";

import Image, { type ImageProps } from "next/image";
import React, { useState } from "react";

import { IMAGE_BLUR_PLACEHOLDER } from "@/config/app";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimizedImageProps extends Omit<ImageProps, "placeholder" | "blurDataURL"> {
  /**
   * Custom fallback element rendered when the image fails to load.
   * Defaults to a rounded grey placeholder with a broken-image icon.
   */
  fallback?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Default fallback
// ---------------------------------------------------------------------------

/**
 * Default fallback displayed when an image URL is broken or unavailable.
 *
 * @param props.className - CSS classes forwarded from the parent so sizing
 *   matches the expected image slot.
 */
function DefaultFallback({ className }: { className?: string | undefined }) {
  return (
    <div
      role="img"
      aria-label="Image unavailable"
      className={[
        "flex items-center justify-center",
        "bg-slate-200 dark:bg-slate-700",
        "text-slate-400 dark:text-slate-500",
        "rounded",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Simple broken-image SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-8 h-8"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Optimised image component with lazy loading, blur placeholder, and
 * error fallback.
 *
 * All props are forwarded to `next/image` except `placeholder` and
 * `blurDataURL`, which are managed internally.
 *
 * Pass `priority={true}` for images that appear above the fold (e.g. hero
 * section) to disable lazy loading and trigger eager preloading.
 *
 * @param props - All standard `next/image` props plus an optional `fallback`.
 */
export function OptimizedImage({
  alt,
  src,
  className,
  fallback,
  priority = false,
  ...rest
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <DefaultFallback className={className} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      // Disable lazy loading for priority (above-the-fold) images
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      // Use the project-wide blur SVG so placeholders are consistent
      placeholder="blur"
      blurDataURL={IMAGE_BLUR_PLACEHOLDER}
      onError={() => setHasError(true)}
      {...rest}
    />
  );
}
