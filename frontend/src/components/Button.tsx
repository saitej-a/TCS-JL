import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * §6.1.1 — Flat architectural button treatments (Phase 1 Anti-Slop Overhaul).
 * Uses Emil Kowalski's custom ease-out (`cubic-bezier(0.23,1,0.32,1)`) and
 * tactile `:active` scale (`active:scale-[0.98]`) over specific properties
 * (`transition-[background-color,border-color,color,transform] duration-150`).
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
  secondary:
    "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
  outline:
    "border border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
  ghost:
    "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-lg transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
  danger:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-rose-500 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
};

/** §6.1.2 — heights, padding, text sizes. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 py-1.5 text-xs",
  md: "h-10 px-4 py-2 text-sm",
  lg: "h-12 px-6 py-3 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows the §6.1.3 spinner and disables the button (duplicate-submission guard). */
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  /**
   * Replaces the variant and size classes outright when a composition specifies
   * custom geometry.
   */
  controlClassName?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  leadingIcon,
  className = "",
  controlClassName,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = (controlClassName === undefined
    ? [
        "inline-flex items-center justify-center gap-1.5 cursor-pointer select-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        fullWidth && "w-full",
        className,
      ]
    : [controlClassName, disabled && "opacity-50 cursor-not-allowed pointer-events-none"]
  )
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading && (
        <span
          aria-hidden="true"
          className="animate-spin w-4 h-4 mr-2 inline-block border-2 border-current border-t-transparent rounded-full align-[-2px]"
        />
      )}
      {leadingIcon}
      {children}
    </button>
  );
}
