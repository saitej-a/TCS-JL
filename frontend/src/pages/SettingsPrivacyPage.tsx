/**
 * /settings/privacy (9.5 Task 4, screen #3) — visibility controls, the live
 * "What others see" preview, and data controls.
 *
 * Reconciled against the real API (not the mock):
 * - The backend exposes exactly ONE identity control: the profile's
 *   `public_identity_mode` (ANONYMOUS | DISPLAY_NAME). The mock's three
 *   toggles are fiction; the other rows state what the API actually does:
 *   the cohort tagline (batch • hiring_type • region) is always shown with
 *   posts, and email is never exposed publicly (AuthorPublicSerializer has
 *   no email field).
 * - The search-engine notice is informational: there is no indexing control
 *   in the API and the community surfaces are not authenticated-page
 *   indexable; no fake toggle is rendered.
 * - The data-export request has NO endpoint (recorded backlog); the button
 *   is disabled with that reason — the plan's "explicitly disabled with a
 *   reason" branch.
 * - Account deletion lives at /settings/danger (DELETE /account/ is Task 7).
 *
 * The preview is derived from the SAME state the toggle edits, so a toggle
 * changes it within the same render — the cheapest place to ship a lying UI
 * is here, so the preview and the control cannot diverge.
 *
 * Phase 12 reconciliation: cards adopt the composition's bordered-header
 * anatomy (title + subtitle over a divider); rows and switches unchanged.
 *
 * Screen #3 minus its annotation artifacts (09.5-CONTEXT §5.2).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiPatch } from "@/api/client";
import { ApiError } from "@/api/errors";
import { getProfile } from "@/api/profile";
import type { CandidateProfilePrivate } from "@/api/profile";
import { SkeletonCard } from "@/components/Skeleton";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { TYPOGRAPHY } from "@/theme/tokens";
import type { ReactElement } from "react";

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";
const CARD_HEAD = "border-b border-slate-100 p-4 pb-3.5 dark:border-slate-800 sm:p-5 sm:pb-4";
const CARD_BODY = "p-4 pt-4 sm:p-5 sm:pt-4";
const ROW =
  "flex items-start justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0";

/** Initials like IdentityPill, without importing the component's DOM shape. */
function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}

export function SettingsPrivacyPage(): ReactElement {
  const [profile, setProfile] = useState<CandidateProfilePrivate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleIdentityMode(): Promise<void> {
    if (profile === null || saving) return;
    const next = profile.public_identity_mode === "ANONYMOUS" ? "DISPLAY_NAME" : "ANONYMOUS";
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<CandidateProfilePrivate>("/profile/", {
        public_identity_mode: next,
      });
      setProfile(updated);
    } catch (patchError) {
      // Roll back: the preview keeps describing the SAVED state on failure.
      if (patchError instanceof ApiError) {
        setError(patchError.message);
      } else {
        setError("Could not save. Check your connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const mode = profile?.public_identity_mode ?? "ANONYMOUS";
  const isAnonymous = mode === "ANONYMOUS";

  return (
    <SettingsLayout
      title="Privacy & visibility"
      description="Control what the community can see about you."
    >
      {loading && <SkeletonCard />}
      {loadFailed && (
        <div className={CARD}>
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Could not load your privacy settings. Try again in a moment.
          </p>
        </div>
      )}
      {profile !== null && (
        <>
          <section className={CARD} aria-label="Visibility controls">
            <div className={CARD_HEAD}>
              <h2 className={TYPOGRAPHY.cardTitle}>Visibility</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                You control what other candidates can see.
              </p>
            </div>
            <div className={`${CARD_BODY} mt-0`}>
              <div className={ROW}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Show my display name
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    When off, you appear as “Anonymous Candidate” everywhere.
                  </p>
                </div>
                {/* The one real control (PATCH /profile/ public_identity_mode). */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isAnonymous}
                  aria-label="Show my display name"
                  data-testid="identity-toggle"
                  disabled={saving}
                  onClick={toggleIdentityMode}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    isAnonymous
                      ? "bg-slate-300 dark:bg-slate-600"
                      : "bg-brand-700 dark:bg-brand-500"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      isAnonymous ? "left-0.5" : "left-[22px]"
                    }`}
                  />
                </button>
              </div>
              <div className={ROW}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Cohort tagline with posts
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Always shown — your batch, category and region help the community read your
                    timeline in context. The API does not offer a per-field off switch.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  Always on
                </span>
              </div>
              <div className={ROW}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Email and contact details
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Never shown publicly. The community API does not expose them to other
                    candidates or visitors.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Protected
                </span>
              </div>
            </div>
            {error !== null && (
              <p role="alert" data-testid="privacy-error" className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
          </section>

          {/* Live preview — derived from the same `mode` the toggle edits. */}
          <section className={CARD} aria-label="What others see">
            <div className={CARD_HEAD}>
              <h2 className={TYPOGRAPHY.cardTitle}>What others see</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Live preview — updates with the toggle above.
              </p>
            </div>
            <div className={CARD_BODY}>
              <div
              data-testid="identity-preview"
              className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                {isAnonymous ? "🎭" : initialsOf(profile.display_name || "Anonymous Candidate")}
              </div>
                  <div className="min-w-0">
                    <p data-testid="preview-name" className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {isAnonymous ? "Anonymous Candidate" : profile.display_name || "Anonymous Candidate"}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {[profile.batch, profile.hiring_type, profile.region]
                        .filter((part) => part !== null && part !== "")
                        .join(" • ")}
                    </p>
                  </div>
                </div>
            </div>
          </section>

          <section className={CARD} aria-label="Data controls">
            <div className={CARD_HEAD}>
              <h2 className={TYPOGRAPHY.cardTitle}>Your data</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Export and search-engine visibility.
              </p>
            </div>
            <div className={`${CARD_BODY} space-y-3`}>
              <div className={ROW}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Download my data
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A machine-readable copy of your profile, timeline and posts.
                  </p>
                </div>
                {/* No export endpoint exists yet (recorded backlog) — disabled
                    with the reason instead of a button that pretends. */}
                <button
                  type="button"
                  disabled
                  data-testid="export-request"
                  title="Data export is not available yet."
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-400 dark:border-slate-600 dark:text-slate-500"
                >
                  Request export
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400" data-testid="export-reason">
                Data export is not available yet.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search engines: community content is not indexed for public search; there is no
                per-account indexing switch.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                To deactivate or permanently delete your account, go to{" "}
                <Link
                  to="/settings/danger"
                  className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                >
                  Danger zone
                </Link>
                .
              </p>
            </div>
          </section>
        </>
      )}
    </SettingsLayout>
  );
}
