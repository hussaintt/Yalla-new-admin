import * as React from "react";

import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  className,
  strokeClassName = "stroke-primary",
  width = 60,
  height = 22,
}: {
  values: number[];
  className?: string;
  strokeClassName?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn("shrink-0", className)}
        style={{ width, height }}
        aria-hidden
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" L ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      style={{ width, height }}
      aria-hidden
    >
      <path
        d={`M ${points}`}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
      />
    </svg>
  );
}
