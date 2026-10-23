/**
 * The product mark (Phase 1 Anti-Slop Overhaul): a precision architectural
 * recruitment-milestone emblem in the canonical Forest Emerald & Warm Stone
 * (`--color-brand-*`) palette.
 *
 * Replaces the generic AI-generated purple/pink glowing planet with a geometric
 * 3-node timeline mark representing Offer -> Survey -> Joining Letter on a solid
 * deep forest ground (#022C22).
 */
import { useId } from "react";

export function BrandMark({
  className = "h-9 w-9",
  title,
}: {
  /** Sizing/rounding only; the artwork keeps its own colours. */
  className?: string;
  /** Set only when the mark has no adjacent text to name it. */
  title?: string;
}) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const clipId = `brand-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role={title === undefined ? "presentation" : "img"}
      aria-hidden={title === undefined ? "true" : undefined}
      aria-label={title}
      data-testid="brand-mark"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title !== undefined && <title>{title}</title>}
      <defs>
        <clipPath id={clipId}>
          <rect width="40" height="40" rx="8" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Solid architectural ground (Forest Emerald 950) with 1px inner border */}
        <rect width="40" height="40" rx="8" fill="#022C22" />
        <rect
          x="0.75"
          y="0.75"
          width="38.5"
          height="38.5"
          rx="7.25"
          fill="none"
          stroke="#047857"
          strokeOpacity="0.75"
          strokeWidth="1.5"
        />

        {/* Subtle ledger rule lines */}
        <line x1="8" y1="13" x2="32" y2="13" stroke="#064E3B" strokeWidth="1" />
        <line x1="8" y1="27" x2="32" y2="27" stroke="#064E3B" strokeWidth="1" />

        {/* Chronological recruitment track (Offer -> Readiness -> Joining Letter) */}
        <path
          d="M10 25 L19 16 L30 16"
          fill="none"
          stroke="#34D399"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Milestone Node 1: Offer Letter */}
        <circle cx="10" cy="25" r="3" fill="#022C22" stroke="#6EE7B7" strokeWidth="2" />

        {/* Milestone Node 2: Readiness Survey */}
        <circle cx="19" cy="16" r="3" fill="#022C22" stroke="#34D399" strokeWidth="2" />

        {/* Milestone Node 3: Joining Letter Confirmed (Filled Primary Accent) */}
        <circle cx="30" cy="16" r="4" fill="#34D399" />
        <circle cx="30" cy="16" r="1.5" fill="#022C22" />
      </g>
    </svg>
  );
}
