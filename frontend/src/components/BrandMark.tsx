/**
 * The product mark: a ringed planet in the brand indigo/violet family.
 *
 * This is the single source for every brand lockup in the app — the top bars,
 * the auth cards and the onboarding header all render it instead of the old
 * `[TCSJL]` text badge, so the logo has one definition rather than a copy per
 * screen. It is inline JSX (not an `<img>` to `public/icon.svg`) so the mark
 * paints with the first frame and still exists under jsdom, where no network
 * asset is fetched.
 *
 * Gradient/clip ids are namespaced with `useId` — two marks on one page (the
 * sidebar lockup plus the mobile top bar) would otherwise share ids, and the
 * browser resolves `url(#…)` against whichever definition it saw first.
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
  const id = (name: string) => `${name}-${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role={title === undefined ? "presentation" : "img"}
      aria-hidden={title === undefined ? "true" : undefined}
      aria-label={title}
      data-testid="brand-mark"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title !== undefined && <title>{title}</title>}
      <defs>
        <radialGradient id={id("spaceGlow")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#0F172A" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={id("planetGrad")} x1="20%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6366F1" />
          <stop offset="70%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>

        <radialGradient id={id("planetHighlight")} cx="35%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#C7D2FE" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#818CF8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#312E81" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={id("ringGradMain")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="30%" stopColor="#818CF8" />
          <stop offset="65%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>

        <linearGradient id={id("ringGradOuter")} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#A855F7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0.6" />
        </linearGradient>

        <clipPath id={id("planetClip")}>
          <circle cx="256" cy="256" r="110" />
        </clipPath>
      </defs>

      {/* Ambient glow behind the planet. */}
      <circle cx="256" cy="256" r="230" fill={`url(#${id("spaceGlow")})`} />

      {/* Stars and sparkles. */}
      <g fill="#A5B4FC" opacity="0.6">
        <circle cx="90" cy="140" r="2" />
        <circle cx="130" cy="95" r="3" />
        <circle cx="410" cy="110" r="2.5" />
        <circle cx="430" cy="370" r="2" />
        <circle cx="100" cy="390" r="2.5" />
        <path d="M 390 160 Q 390 170 380 170 Q 390 170 390 180 Q 390 170 400 170 Q 390 170 390 160 Z" fill="#E0E7FF" opacity="0.8" />
        <path d="M 120 320 Q 120 327 113 327 Q 120 327 120 334 Q 120 327 127 327 Q 120 327 120 320 Z" fill="#E0E7FF" opacity="0.7" />
      </g>

      {/* Back half of the rings (tilted ~-26°), behind the planet. */}
      <g transform="rotate(-26 256 256)">
        <ellipse cx="256" cy="256" rx="236" ry="58" fill="none" stroke={`url(#${id("ringGradOuter")})`} strokeWidth="2.5" opacity="0.4" />
        <path d="M 24 256 A 232 54 0 0 1 488 256" fill="none" stroke={`url(#${id("ringGradMain")})`} strokeWidth="14" strokeLinecap="round" opacity="0.85" />
        <path d="M 52 256 A 204 46 0 0 1 460 256" fill="none" stroke={`url(#${id("ringGradOuter")})`} strokeWidth="18" strokeLinecap="round" opacity="0.95" />
        <path d="M 88 256 A 168 36 0 0 1 424 256" fill="none" stroke="#E0E7FF" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* Planet body, its cloud bands, and the lighting overlay. */}
      <circle cx="256" cy="256" r="110" fill={`url(#${id("planetGrad")})`} />
      <g clipPath={`url(#${id("planetClip")})`} opacity="0.35">
        <ellipse cx="256" cy="220" rx="140" ry="24" fill="#312E81" />
        <ellipse cx="256" cy="245" rx="140" ry="18" fill="#C7D2FE" opacity="0.3" />
        <ellipse cx="256" cy="280" rx="140" ry="26" fill="#1E1B4B" opacity="0.6" />
        <ellipse cx="256" cy="315" rx="140" ry="20" fill="#4338CA" />
        <ellipse cx="256" cy="180" rx="140" ry="22" fill="#818CF8" opacity="0.4" />
      </g>
      <circle cx="256" cy="256" r="110" fill={`url(#${id("planetHighlight")})`} />

      {/* Shadow the planet casts onto its own lower-right limb. */}
      <g clipPath={`url(#${id("planetClip")})`}>
        <path
          d="M 170 300 C 230 330 310 310 366 256 C 366 320 310 366 256 366 C 200 366 160 330 170 300 Z"
          fill="#090A1A"
          opacity="0.45"
        />
      </g>

      {/* Front half of the rings, passing over the planet. */}
      <g transform="rotate(-26 256 256)">
        <ellipse cx="256" cy="256" rx="236" ry="58" fill="none" stroke={`url(#${id("ringGradOuter")})`} strokeWidth="2.5" opacity="0.4" />
        <path d="M 488 256 A 232 54 0 0 1 24 256" fill="none" stroke={`url(#${id("ringGradMain")})`} strokeWidth="14" strokeLinecap="round" />
        <path d="M 460 256 A 204 46 0 0 1 52 256" fill="none" stroke={`url(#${id("ringGradOuter")})`} strokeWidth="18" strokeLinecap="round" />
        <path d="M 424 256 A 168 36 0 0 1 88 256" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" opacity="0.9" />
        <circle cx="455" cy="275" r="4" fill="#F472B6" filter="drop-shadow(0 0 4px #F472B6)" />
      </g>
    </svg>
  );
}
