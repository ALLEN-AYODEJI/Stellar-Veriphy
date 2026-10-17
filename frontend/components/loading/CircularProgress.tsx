"use client";

import { cn } from "@/utils/cn";

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showPercentage?: boolean;
  indeterminate?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Circular progress indicator with accessibility features, mirroring
 * the linear ProgressBar's API.
 */
export function CircularProgress({
  value,
  max = 100,
  size = 64,
  strokeWidth = 6,
  label,
  showPercentage = true,
  indeterminate = false,
  className,
  ariaLabel,
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const ariaValueNow = indeterminate ? undefined : Math.round(value);
  const ariaValueText = indeterminate ? "indeterminate" : `${Math.round(percentage)}%`;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={ariaValueNow}
        aria-valuetext={ariaValueText}
        aria-label={ariaLabel || label || "Progress"}
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={cn(indeterminate && "animate-spin")}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
            className={cn(
              "stroke-blue-500 transition-[stroke-dashoffset] duration-300 ease-out",
              !indeterminate && "text-blue-500"
            )}
          />
        </svg>
        {showPercentage && !indeterminate && (
          <span className="absolute text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      )}
    </div>
  );
}
