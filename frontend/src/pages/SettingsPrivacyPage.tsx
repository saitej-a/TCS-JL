/**
 * /settings/privacy (9.5 Task 4, screen #3) — ported from
 * `tcs_joining_tracker_privacy_settings` (Phase 16).
 *
 * The composition's markup is carried: the Home > Settings > Privacy breadcrumb
 * with its chevrons, the `Privacy` title block, the `flex items-start gap-8`
 * layout (720px settings column + 320px `sticky top-8` column), the four cards
 * with their headers, the radio-card group, the switch rows with the
 * composition's own `switch-checkbox` / `switch-bg` / `switch-dot` markup, the
 * brand-tinted indexing row, the download row, the rose danger link, the live
 * preview box and the "Privacy at a glance" checklist. The switch behaviour the
 * markup names but never defines lives in the composition's `<style>` block and
 * is carried into `styles/stitch-scopes.css`.
 *
 * The API exposes exactly **one** preference here — the profile's
 * `public_identity_mode` (ANONYMOUS | DISPLAY_NAME) — so the composition's
 * three-level profile-visibility radio group is carried with its two real
 * options, and every other control in the mockup is carried **disabled, at the
 * state that is actually true**, with a line saying why:
 *
 * - the email switch is off because the community API exposes no address to
 *   other candidates (`AuthorPublicSerializer` has no email field);
 * - the cohort-tagline and location switches are on because those values travel
 *   with every post and there is no per-field off switch;
 * - the upvote row and the default-post-visibility select have no backing field
 *   (there is no public candidate profile page yet, and each post picks its own
 *   identity);
 * - the download button is disabled because no export endpoint exists, and the
 *   indexing row states what is true rather than the mockup's claim that a
 *   control turned indexing off.
 *
 * Dropped and declared: the "Save privacy settings" button (every control here
 * writes on change, so there is nothing to submit) and the page footer (the shell
 * owns the footer). The preview is derived from the SAME state the control edits,
 * so the two cannot diverge — including on a failed save, where the radio group
 * falls back to the saved value.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiPatch } from "@/api/client";
import { ApiError } from "@/api/errors";
import { getProfile, HIRING_TYPE_LABELS } from "@/api/profile";
import type { CandidateProfilePrivate } from "@/api/profile";
import { SkeletonCard } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import type { ReactElement, ReactNode } from "react";

const CARD = "bg-white rounded-card border border-slate-200 p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800";
const CARD_HEAD = "mb-4";
const CARD_H2 = "text-base font-semibold text-slate-900 dark:text-slate-100";
const CARD_SUB = "text-xs text-slate-500 mt-0.5 dark:text-slate-400";
const RADIO_ROW = "flex items-start p-4 rounded-xl cursor-pointer transition-all";
const RADIO = "mt-0.5 h-4 w-4 text-brand-600 border-slate-300 focus:ring-brand-600 focus-ring";
const RADIO_TITLE = "block text-sm font-semibold text-slate-900 dark:text-slate-100";
const RADIO_SUB = "block text-xs text-slate-500 mt-0.5 dark:text-slate-400";
const ROW = "py-4 flex items-start sm:items-center justify-between gap-4";
const ROW_TITLE = "text-sm font-medium text-slate-900 dark:text-slate-100";
const ROW_SUB = "text-xs text-slate-500 mt-0.5 dark:text-slate-400";
const CHEVRON = "w-3.5 h-3.5 text-slate-400";

/** The composition's switch, at a state the app cannot change (see the docblock). */
function FixedSwitch({
  id,
  on,
  describedBy,
}: {
  id: string;
  on: boolean;
  describedBy: string;
}): ReactElement {
  return (
    <label
      htmlFor={id}
      className="relative inline-flex items-center shrink-0 cursor-not-allowed mt-0.5 sm:mt-0"
    >
      <input
        id={id}
        type="checkbox"
        checked={on}
        disabled
        readOnly
        aria-describedby={describedBy}
        className="sr-only switch-checkbox focus-ring"
      />
      <div
        className={`w-11 h-6 rounded-full switch-bg transition-colors duration-200 ease-in-out p-0.5 ${
          on ? "bg-brand-600" : "bg-slate-200"
        } opacity-60`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-sm switch-dot transition-transform duration-200 ease-in-out ${
            on ? "transform translate-x-5" : ""
          }`}
        />
      </div>
    </label>
  );
}

/** One of the composition's switch rows: label + explanation on the left. */
function SwitchRow({
  id,
  title,
  description,
  on,
}: {
  id: string;
  title: string;
  description: string;
  on: boolean;
}): ReactElement {
  return (
    <div className={ROW}>
      <div className="flex-1 min-w-0">
        <div className={ROW_TITLE}>{title}</div>
        <div id={`${id}-note`} className={ROW_SUB}>
          {description}
        </div>
      </div>
      <FixedSwitch id={id} on={on} describedBy={`${id}-note`} />
    </div>
  );
}

function BreadcrumbChevron(): ReactElement {
  return (
    <svg className={CHEVRON} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** Initials like IdentityPill, without importing the component's DOM shape. */
function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}

/** The preview's date, in the composition's own `Sep 2026` shape. */
function monthYear(iso: string | undefined): string {
  if (iso === undefined) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** A "Privacy at a glance" check row. */
function CheckRow({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
      <svg
        className="w-4 h-4 text-emerald-600 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function SettingsPrivacyPage(): ReactElement {
  const { user } = useAuth();
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

  async function setIdentityMode(next: "ANONYMOUS" | "DISPLAY_NAME"): Promise<void> {
    if (profile === null || saving) return;
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
    <div className="skin-v2 max-w-[1040px] mx-auto font-body antialiased">
      <header className="mb-6">
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2 dark:text-slate-400" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-slate-900 transition-colors dark:hover:text-slate-100">
            Home
          </Link>
          <BreadcrumbChevron />
          <Link to="/settings" className="hover:text-slate-900 transition-colors dark:hover:text-slate-100">
            Settings
          </Link>
          <BreadcrumbChevron />
          <span className="text-slate-900 font-medium dark:text-slate-100">Privacy</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Privacy</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          You control what other candidates and search engines can see
        </p>
      </header>

      {loading && <SkeletonCard />}
      {loadFailed && (
        <div className={CARD}>
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Could not load your privacy settings. Try again in a moment.
          </p>
        </div>
      )}

      {profile !== null && (
        <div className="flex flex-col lg:flex-row items-start gap-8 min-w-0">
          {/* Left column: the settings stack. */}
          <div className="w-full lg:max-w-[720px] min-w-0 space-y-6">
            <section className={CARD} aria-label="Profile visibility">
              <div className={CARD_HEAD}>
                <h2 className={CARD_H2}>Profile visibility</h2>
                <p className={CARD_SUB}>
                  Control whether your display name or an anonymous identity appears on your
                  contributions.
                </p>
              </div>

              {/* The API's one preference, in the composition's radio-card markup:
                  two real states, written on change. */}
              <fieldset className="space-y-3" data-testid="identity-toggle" disabled={saving}>
                <legend className="sr-only">How your identity appears to other candidates</legend>
                <label
                  className={`${RADIO_ROW} ${
                    isAnonymous
                      ? "border-2 border-brand-600 bg-brand-50/40"
                      : "border border-slate-200 bg-white hover:bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="public_identity_mode"
                    value="ANONYMOUS"
                    checked={isAnonymous}
                    onChange={() => void setIdentityMode("ANONYMOUS")}
                    className={RADIO}
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <span className={RADIO_TITLE}>Anonymous</span>
                    <span className={RADIO_SUB}>
                      You appear as “Anonymous Candidate” — your name is never shown to other
                      candidates
                    </span>
                  </div>
                </label>

                <label
                  className={`${RADIO_ROW} ${
                    !isAnonymous
                      ? "border-2 border-brand-600 bg-brand-50/40"
                      : "border border-slate-200 bg-white hover:bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="public_identity_mode"
                    value="DISPLAY_NAME"
                    checked={!isAnonymous}
                    onChange={() => void setIdentityMode("DISPLAY_NAME")}
                    className={RADIO}
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <span className={RADIO_TITLE}>Show my display name</span>
                    <span className={RADIO_SUB}>
                      Your display name appears with your posts, comments and upvotes
                    </span>
                  </div>
                </label>
              </fieldset>

              {error !== null && (
                <p
                  role="alert"
                  data-testid="privacy-error"
                  className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400"
                >
                  {error}
                </p>
              )}
            </section>

            <section className={CARD} aria-label="Contact details">
              <div className={CARD_HEAD}>
                <h2 className={CARD_H2}>Contact details</h2>
                <p className={CARD_SUB}>
                  What fellow candidates can see or use to identify you.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <SwitchRow
                  id="privacy-email"
                  title="Show my email address on my profile"
                  description="Always off — hidden from everyone. The community API exposes no email address to other candidates."
                  on={false}
                />
                <SwitchRow
                  id="privacy-cohort"
                  title="Show my cohort tagline with my posts"
                  description="Always on — your batch, category and region travel with each post so peers can read it in context; the API has no per-field off switch."
                  on
                />
                <SwitchRow
                  id="privacy-location"
                  title="Show my location"
                  description="Always on — your region appears with your community posts. There is no separate location control."
                  on
                />
              </div>
            </section>

            <section className={CARD} aria-label="Community">
              <div className={CARD_HEAD}>
                <h2 className={CARD_H2}>Community</h2>
                <p className={CARD_SUB}>
                  How your activity appears in forum discussions.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <SwitchRow
                  id="privacy-upvotes"
                  title="Let members see my upvoted posts"
                  description="Not available yet. There is no public candidate profile page for the API to list them on, so this row will offer the control when one exists."
                  on={false}
                />

                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div>
                    <label htmlFor="post-visibility" className={`${ROW_TITLE} block`}>
                      Default post visibility
                    </label>
                    <span
                      id="post-visibility-note"
                      className={`${ROW_SUB} block`}
                    >
                      Each post chooses its own identity when you write it, so there is no stored
                      default to set here.
                    </span>
                  </div>
                  <div className="w-full sm:w-48 shrink-0">
                    <select
                      id="post-visibility"
                      disabled
                      aria-describedby="post-visibility-note"
                      className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 focus-ring disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="per-post">Chosen per post</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className={`${CARD} space-y-5`} aria-label="Search engines and data">
              <div>
                <h2 className={CARD_H2}>Search engines and data</h2>
                <p className={CARD_SUB}>
                  Data portability, index suppression, and account lifecycle settings.
                </p>
              </div>

              {/* The composition's brand-tinted row, with what is actually true: the
                  API has no per-account indexing switch, and nothing claimed here
                  rests on one having been flipped off. */}
              <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-xl flex items-start gap-3">
                <div className="mt-0.5 text-brand-600 flex-shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed dark:text-slate-300">
                  <span className="font-semibold text-brand-900">There is no indexing switch.</span>{" "}
                  Community content sits behind sign-in and is not offered to public search; account
                  settings have no per-user crawler control to turn on or off.
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex-1 min-w-0">
                  <div className={ROW_TITLE}>Download my data</div>
                  <div className={ROW_SUB}>
                    A machine-readable copy of your profile, timeline and posts.
                  </div>
                  <p className={ROW_SUB} data-testid="export-reason">
                    Data export is not available yet.
                  </p>
                </div>
                {/* No export endpoint exists yet (recorded backlog) — disabled
                    with the reason instead of a button that pretends. */}
                <button
                  type="button"
                  disabled
                  data-testid="export-request"
                  title="Data export is not available yet."
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 focus-ring transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-300 self-start sm:self-auto"
                >
                  <svg
                    className="w-4 h-4 text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download my data</span>
                </button>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex-1 min-w-0">
                  <div className={ROW_TITLE}>Danger zone</div>
                  <div className={ROW_SUB}>
                    Permanently erase your timeline, survey answers, and profile record.
                  </div>
                </div>
                <Link
                  to="/settings/danger"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 focus-ring rounded p-1 dark:text-rose-400 dark:hover:text-rose-300 self-start sm:self-auto shrink-0"
                >
                  <svg
                    className="w-4 h-4 text-rose-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Delete my account</span>
                </Link>
              </div>
            </section>
          </div>

          {/* Right column: the preview card (sticky on desktop). */}
          <div className="w-full lg:w-[320px] lg:sticky lg:top-8 space-y-6 flex-shrink-0">
            <div className="bg-white rounded-card border border-slate-200 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 dark:border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  What others see
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60">
                  Live preview
                </span>
              </div>

              <div
                data-testid="identity-preview"
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                    {isAnonymous ? "🎭" : initialsOf(profile.display_name || "Anonymous Candidate")}
                  </div>
                  <div>
                    <div
                      data-testid="preview-name"
                      className="text-sm font-semibold text-slate-900 leading-tight dark:text-slate-100"
                    >
                      {isAnonymous ? "Anonymous Candidate" : profile.display_name || "Anonymous Candidate"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {user?.is_verified ? "Verified Candidate" : "Not verified yet"}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800">
                    {HIRING_TYPE_LABELS[profile.hiring_type]}
                  </span>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-200/60 pt-3 dark:border-slate-700">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400">Joined timeline:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {monthYear(user?.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded dark:bg-slate-800 dark:text-slate-400">
                      hidden
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {profile.region === "" ? "not set" : profile.region}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-3 leading-normal flex items-start gap-1.5">
                <svg
                  className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>This preview updates as you change the settings on the left.</span>
              </p>
            </div>

            {/* Every line here is a property of this app, not of the mockup. */}
            <div className="bg-white rounded-card border border-slate-200 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 dark:text-slate-400">
                Privacy at a glance
              </h3>
              <div className="space-y-2.5">
                <CheckRow>Email masked everywhere</CheckRow>
                <CheckRow>Reports reviewed by humans</CheckRow>
                <CheckRow>No third-party trackers</CheckRow>
                <CheckRow>No ad networks</CheckRow>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
