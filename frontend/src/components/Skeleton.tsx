import type { HTMLAttributes } from "react";

import { SURFACES } from "@/theme/tokens";

type SkeletonShape = "rect" | "text" | "circle";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Base shape: rectangular block, text line, or circular avatar. */
  shape?: SkeletonShape;
  className?: string;
}

/** §6.7.2: structural placeholder blocks rendered during API queries. */
export function Skeleton({ shape = "rect", className = "", ...rest }: SkeletonProps) {
  const shapeClass =
    shape === "circle"
      ? "rounded-full"
      : shape === "text"
        ? "h-4 rounded-md"
        : "rounded-md";
  return (
    <div
      aria-hidden="true"
      className={`${SURFACES.skeleton} ${shapeClass} ${className}`.trim()}
      {...rest}
    />
  );
}

/** §6.7.2's structural card placeholder (flat 1px-bordered frame). */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[10px] p-4 sm:p-5 space-y-3 ${className}`.trim()}
    >
      <div className="flex items-center justify-between">
        <Skeleton shape="rect" className="h-5 w-[120px]" />
        <Skeleton shape="rect" className="h-5 w-[60px]" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
