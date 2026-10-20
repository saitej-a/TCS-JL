/**
 * The non-CSS half of the token system (Task 1, upgraded in Phase 1 Anti-Slop
 * Overhaul): the 05 §4.3 typography scale, flat architectural surfaces, and
 * Emil Kowalski motion constants so views never invent values.
 */

/** §4.3 typographic roles, refined to DESIGN.md's hierarchy. */
export const TYPOGRAPHY = {
  displayHero: "font-headline text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.06]",
  pageTitle: "font-headline text-2xl font-semibold tracking-tight leading-snug",
  sectionHeader: "font-headline text-[17px] font-semibold tracking-tight leading-snug",
  cardTitle: "text-[15px] font-semibold tracking-tight leading-snug",
  subheadLabel: "text-sm font-medium",
  bodyPrimary: "text-[15px] leading-relaxed",
  bodySecondary: "text-sm leading-normal",
  caption: "text-xs text-muted tabular-nums",
  badgePill: "text-[11px] font-medium tracking-wide",
  legal: "text-[11px] leading-normal",
} as const;

/**
 * Structural classes (DESIGN.md §1.4):
 * - Resting cards are flat with 1px structural borders (`shadow-none`).
 * - Dialogs float above the canvas and carry elevation + crisp borders.
 */
export const SURFACES = {
  /** §6.4 flat architectural card container (no resting shadow). */
  card: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[10px] p-4 sm:p-5 transition-colors duration-150 hover:border-slate-300 dark:hover:border-slate-700",
  /** §6.6 desktop dialog & mobile bottom sheet. */
  dialog:
    "bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-800",
  /** §6.7.2 skeleton block (base classes, size/shape applied by the caller). */
  skeleton: "animate-pulse bg-slate-200/80 dark:bg-slate-800",
} as const;

/** Emil Kowalski (`emil-design-eng`) interaction & transition tokens. */
export const MOTION = {
  press: "active:scale-[0.98] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
  enter: "transition-[transform,opacity] duration-180 ease-[cubic-bezier(0.23,1,0.32,1)]",
} as const;

/** Breakpoint at which modals switch to bottom-sheet presentation (§6.6). */
export const BOTTOM_SHEET_MAX_WIDTH_PX = 639;

/** Shared button heights (§6.1.2) so other components align. */
export const BUTTON_HEIGHTS = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
} as const;
