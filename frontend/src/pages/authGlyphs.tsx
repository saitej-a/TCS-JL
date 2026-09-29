/**
 * Shared inline SVG glyphs for the auth pages (Phase 12): the compositions'
 * icon vocabulary rendered as dependency-free stroke SVGs in the lucide
 * lineage. Kept in one module so the six screens share one set of shapes
 * (D-06: extraction at real repeats — these repeat across ≥3 auth screens).
 */
interface GlyphProps {
  className?: string;
}

/** Shield with checkmark — the composition's trust/brand emblem. */
export function ShieldCheckGlyph({ className = "h-5 w-5" }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Closed padlock — security hints. */
export function LockGlyph({ className = "h-4 w-4" }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/** Envelope — the verification-pending illustration's mail anchor. */
export function MailGlyph({ className = "h-12 w-12" }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

/** Refresh arc — the resend verification action. */
export function RefreshGlyph({ className = "h-4 w-4" }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 2v6h-6" />
      <path d="M21 8a9 9 0 1 0-.4 5.2" />
    </svg>
  );
}

/** Right arrow — forward CTAs (send reset link, continue). */
export function ArrowRightGlyph({ className = "h-4 w-4" }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** Check in circle — success states. */
export function CheckCircleGlyph({ className = "h-8 w-8" }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12.5 2.5 2.5 5-5" />
    </svg>
  );
}
