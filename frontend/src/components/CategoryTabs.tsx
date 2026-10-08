/**
 * §7.6's filter row, built to the `community_discussions_feed` composition: the
 * overflowing pill row (`flex items-center gap-2 overflow-x-auto pb-1 text-xs
 * no-scrollbar`) carrying `All` plus a capped set of categories and the
 * composition's `More` pill with its `tune` glyph, and the three sort tabs as
 * the composition's `border-b-2` row with a glyph per tab (`schedule`,
 * `local_fire_department`, `thumb_up`).
 *
 * The pill row is a radiogroup so keyboard users get roving focus for free; the
 * `More` toggle is a disclosure button (aria-expanded), never a category. That is
 * why the pills carry `role="radio"`/`aria-checked` on top of the composition's
 * classes.
 *
 * Dark parity (06.5/Phase 16 follow-up): the app renders dark by default, so each
 * surface here carries its `dark:` pair — the composition's light classes are
 * untouched, and dark swaps the pill/tab surfaces onto the slate-800/700 ramp.
 *
 * Recorded divergences from the mockup: the design's pills carry counts
 * (`Joining Letter (55)`) and its row shows only five categories plus `[More]`.
 * Counts have no endpoint (9.3 D7 keeps `GET /posts/categories/` unbuilt), so no
 * number is rendered — but the cap-and-expand behaviour is real, and a category
 * selected from behind the fold stays visible so the active filter is never
 * hidden.
 */
import { useState } from "react";

import { POST_CATEGORIES } from "@/content/postCategories";
import { CATEGORY_LABELS } from "@/theme/badges";

export type FeedTab = "newest" | "trending" | "votes";

export const FEED_TABS: readonly { value: FeedTab; label: string; glyph: string }[] = [
  { value: "newest", label: "Latest (Newest First)", glyph: "schedule" },
  { value: "trending", label: "Trending (Most Active)", glyph: "local_fire_department" },
  { value: "votes", label: "Top Voted", glyph: "thumb_up" },
] as const;

export interface CategoryTabsProps {
  category: string | null;
  tab: FeedTab;
  onCategoryChange: (category: string | null) => void;
  onTabChange: (tab: FeedTab) => void;
}

/** How many category pills sit above the fold, per the design's row. */
const VISIBLE_CATEGORY_COUNT = 5;

/** The composition's pill row. */
const PILL_ROW = "flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar";
const PILL_ACTIVE =
  "inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-600 text-white font-medium shadow-2xs shrink-0 transition-transform active:scale-95";
const PILL_IDLE =
  "inline-flex items-center px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 shadow-2xs shrink-0 transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700";
const PILL_MORE =
  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-600 font-medium border border-slate-200 shadow-2xs shrink-0 transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700";

/** The composition's tab row. */
const TAB_ROW =
  "border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sm:gap-6 text-sm font-medium overflow-x-auto no-scrollbar";
const TAB_ACTIVE =
  "py-2.5 px-1 border-b-2 border-indigo-600 text-indigo-600 font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap dark:border-indigo-500 dark:text-indigo-400";
const TAB_IDLE =
  "py-2.5 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap dark:text-slate-400 dark:hover:text-slate-100 dark:hover:border-slate-600";

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
            <span className="material-symbols-outlined text-sm" data-icon="tune" aria-hidden="true">
              tune
            </span>
            <span>{expanded ? "Fewer" : "More"}</span>
          </button>
        )}
      </div>

      <div role="radiogroup" aria-label="Sort posts" className={TAB_ROW}>
        {FEED_TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="radio"
            aria-checked={tab === entry.value}
            onClick={() => onTabChange(entry.value)}
            className={tab === entry.value ? TAB_ACTIVE : TAB_IDLE}
          >
            <span className="material-symbols-outlined text-lg" data-icon={entry.glyph} aria-hidden="true">
              {entry.glyph}
            </span>
            <span>{entry.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
