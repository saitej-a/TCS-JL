/**
 * §7.6's filter row (upgraded in Phase 1 Anti-Slop Overhaul): the overflowing
 * pill row (`flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar`)
 * carrying `All` plus a capped set of categories and the `More` disclosure pill,
 * and the three sort tabs as a flat `border-b-2` underline row with Lucide SVG icons.
 *
 * The pill row is a radiogroup so keyboard users get roving focus for free; the
 * `More` toggle is a disclosure button (aria-expanded), never a category. That is
 * why the pills carry `role="radio"`/`aria-checked`.
 */
import { useState } from "react";
import { Clock, Flame, SlidersHorizontal, ThumbsUp, type LucideIcon } from "lucide-react";

import { POST_CATEGORIES } from "@/content/postCategories";
import { CATEGORY_LABELS } from "@/theme/badges";

export type FeedTab = "newest" | "trending" | "votes";

export const FEED_TABS: readonly { value: FeedTab; label: string; glyph: string }[] = [
  { value: "newest", label: "Latest (Newest First)", glyph: "schedule" },
  { value: "trending", label: "Trending (Most Active)", glyph: "local_fire_department" },
  { value: "votes", label: "Top Voted", glyph: "thumb_up" },
] as const;

const TAB_ICONS: Record<FeedTab, LucideIcon> = {
  newest: Clock,
  trending: Flame,
  votes: ThumbsUp,
};

export interface CategoryTabsProps {
  category: string | null;
  tab: FeedTab;
  onCategoryChange: (category: string | null) => void;
  onTabChange: (tab: FeedTab) => void;
}

/** How many category pills sit above the fold, per the design's row. */
const VISIBLE_CATEGORY_COUNT = 5;

/** Flat architectural pill row — zero resting shadows, brand-700 active fill. */
const PILL_ROW = "flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar";
const PILL_ACTIVE =
  "inline-flex items-center px-4 py-1.5 rounded-full bg-brand-700 text-white font-medium shrink-0 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] dark:bg-brand-600";
const PILL_IDLE =
  "inline-flex items-center px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 shrink-0 transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700";
const PILL_MORE =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-600 font-medium border border-slate-200 shrink-0 transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700";

/** Flat architectural sort tab row. */
const TAB_ROW =
  "border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sm:gap-6 text-sm font-medium overflow-x-auto no-scrollbar";
const TAB_ACTIVE =
  "py-2.5 px-1 border-b-2 border-brand-700 text-brand-700 font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap dark:border-brand-400 dark:text-brand-400";
const TAB_IDLE =
  "py-2.5 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors duration-150 flex items-center gap-1.5 shrink-0 whitespace-nowrap dark:text-slate-400 dark:hover:text-slate-100 dark:hover:border-slate-600";

export function CategoryTabs({ category, tab, onCategoryChange, onTabChange }: CategoryTabsProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  const folded = POST_CATEGORIES.slice(0, VISIBLE_CATEGORY_COUNT);
  const rest = POST_CATEGORIES.slice(VISIBLE_CATEGORY_COUNT);
  // The URL carries a bare string; resolve it against the vocabulary so the
  // rest of the component works in PostCategory, not "any string".
  const selected = POST_CATEGORIES.find((key) => key === category) ?? null;
  // A selection made from behind the fold stays on screen.
  const visible = expanded || (selected !== null && !folded.includes(selected)) ? POST_CATEGORIES : folded;

  return (
    <>
      <div role="radiogroup" aria-label="Filter by category" className={PILL_ROW}>
        <button
          type="button"
          role="radio"
          aria-checked={category === null}
          onClick={() => onCategoryChange(null)}
          className={category === null ? PILL_ACTIVE : PILL_IDLE}
        >
          All
        </button>
        {visible.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={category === key}
            onClick={() => onCategoryChange(key)}
            className={category === key ? PILL_ACTIVE : PILL_IDLE}
          >
            {CATEGORY_LABELS[key]}
          </button>
        ))}
        {rest.length > 0 && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className={PILL_MORE}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{expanded ? "Fewer" : "More"}</span>
          </button>
        )}
      </div>

      <div role="radiogroup" aria-label="Sort posts" className={TAB_ROW}>
        {FEED_TABS.map((entry) => {
          const Icon = TAB_ICONS[entry.value];
          return (
            <button
              key={entry.value}
              type="button"
              role="radio"
              aria-checked={tab === entry.value}
              onClick={() => onTabChange(entry.value)}
              className={tab === entry.value ? TAB_ACTIVE : TAB_IDLE}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
