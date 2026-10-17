"use client";

/**
 * Avatar.tsx
 *
 * Reusable avatar component for representing a user or creator, with a
 * graceful fallback to initials when no image is available, plus an
 * AvatarGroup helper for stacked/overlapping layouts.
 *
 * Usage Examples:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Image avatar:
 *    <Avatar src="/users/jane.png" name="Jane Doe" />
 *
 * 2. Initials fallback (no src, or the image fails to load):
 *    <Avatar name="Jane Doe" size="lg" />
 *
 * 3. Square shape with an online status indicator:
 *    <Avatar name="Jane Doe" shape="square" status="online" />
 *
 * 4. Group layout with overflow count:
 *    <AvatarGroup avatars={[{ name: "Jane" }, { name: "Sam" }, { name: "Alex" }]} max={2} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";

import { cn } from "@/utils/cn";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "square";
export type AvatarStatus = "online" | "offline" | "away" | "busy";

export interface AvatarProps {
  /** Image URL. Falls back to initials if omitted or if the image fails to load. */
  src?: string;
  /** Accessible label / alt text. Falls back to `name` when omitted. */
  alt?: string;
  /** Display name, used to derive initials and a deterministic background color. */
  name?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  /** Optional presence indicator rendered in the bottom-right corner. */
  status?: AvatarStatus;
  className?: string;
}

const SIZE_STYLES: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const STATUS_STYLES: Record<AvatarStatus, string> = {
  online: "bg-emerald-500",
  offline: "bg-gray-400 dark:bg-gray-600",
  away: "bg-amber-500",
  busy: "bg-red-500",
};

const STATUS_DOT_SIZE: Record<AvatarSize, string> = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
  xl: "w-3.5 h-3.5",
};

const AVATAR_PALETTE = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  if (parts.length <= 1) return (first.slice(0, 2) || "?").toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function getColorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function Avatar({
  src,
  alt,
  name = "",
  size = "md",
  shape = "circle",
  status,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(src) && !imageError;
  const displayName = name || alt || "";
  const initials = getInitials(displayName);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden font-medium text-white select-none",
        shape === "circle" ? "rounded-full" : "rounded-lg",
        SIZE_STYLES[size],
        !showImage && getColorFromName(displayName || "?"),
        className
      )}
      title={displayName || undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar sources are arbitrary external URLs
        <img
          src={src}
          alt={alt || name || "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <>
          <span aria-hidden="true">{initials}</span>
          <span className="sr-only">{displayName || "Avatar"}</span>
        </>
      )}
      {status && (
        <>
          <span
            className={cn(
              "absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-900",
              STATUS_STYLES[status],
              STATUS_DOT_SIZE[size]
            )}
            aria-hidden="true"
          />
          <span className="sr-only"> · Status: {status}</span>
        </>
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  avatars: AvatarProps[];
  /** Maximum number of avatars shown before collapsing into a "+N" indicator. Defaults to 4. */
  max?: number;
  /** Default size applied to every avatar unless overridden per-item. */
  size?: AvatarSize;
  /** Default shape applied to every avatar unless overridden per-item. */
  shape?: AvatarShape;
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = "md",
  shape = "circle",
  className,
}: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - visible.length;

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((avatar, index) => (
        <span
          key={index}
          className={cn(index > 0 && "-ml-2")}
          style={{ zIndex: visible.length - index }}
        >
          <Avatar
            {...avatar}
            size={avatar.size ?? size}
            shape={avatar.shape ?? shape}
            className={cn("ring-2 ring-white dark:ring-gray-900", avatar.className)}
          />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "-ml-2 relative inline-flex shrink-0 items-center justify-center font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900",
            shape === "circle" ? "rounded-full" : "rounded-lg",
            SIZE_STYLES[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

export default Avatar;
