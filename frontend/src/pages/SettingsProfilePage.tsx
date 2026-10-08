/**
 * /settings/profile (9.5 Task 3, screen #2) — ported from
 * `tcs_joining_tracker_profile_settings_form` (Phase 16).
 *
 * The composition's markup is carried: the Home > Settings > Profile breadcrumb
 * with its chevrons, the `text-3xl` title block, the `flex items-start gap-8`
 * two-column body (720px form column + 320px help column), the three cards with
 * their bordered headers and 22px titles, the uppercase labels and their field
 * controls, the amber callout, the radio stack, the sticky action bar with its
 * amber "Unsaved changes" pill, and the rose "Delete my account instead" link.
 *
 * What is carried but re-pointed, and why:
 *
 * - **Category.** The composition draws the control *open*, listing
 *   `Assistant Professor` / `Associate Professor` / `System Engineer` / `Digital`
 *   / `Prime`. Those are not the backend's vocabulary and a native `<select>`
 *   cannot be styled open, so the port carries the control's closed treatment and
 *   the real `HIRING_TYPES` options (PRIME / DIGITAL / NINJA / OTHER); the open
 *   list's own tokens are declared dropped.
 * - **Timeline visibility.** The composition's three options (visible to members /
 *   cohort only / private) are a milestone-privacy axis the API does not have, so
 *   the card carries the real `public_identity_mode` axis under an honest title
 *   (`Identity visibility`; the composition's heading is declared dropped).
 * - **The amber callout.** Its sentence ("Changing your joining date after a survey
 *   response may re-open the survey") describes a backend rule that does not
 *   exist — `update_profile` neither clamps nor warns. The callout's markup is
 *   carried with the honest copy the 9.5 pass wrote.
 *
 * Three controls in the composition depend on fields the API does not expose and
 * are declared dropped rather than rendered as dead affordances: the avatar
 * `Upload photo` button (the avatar keeps its markup and shows the real initials),
 * the `Show my category badge on my posts` checkbox, and the page footer (the shell
 * owns the footer and already renders the disclaimer). The mockup's sample name,
 * masked address, category list, `12 Sep 2026` date, `Hyderabad` location and
 * `Profile v2.4` / `Synced with server` captions are all in `Fabrication kept out`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker } from "react-router-dom";

import { apiPatch } from "@/api/client";
import { ApiError } from "@/api/errors";
import { getProfile, HIRING_TYPES, HIRING_TYPE_LABELS } from "@/api/profile";
import type { CandidateProfilePrivate, HiringType } from "@/api/profile";
import { SkeletonCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import type { ReactElement, ReactNode } from "react";

const CARD =
  "bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-800";
const CARD_HEAD = "border-b border-slate-100 pb-4 mb-5 dark:border-slate-800";
const CARD_H2 = "text-[22px] font-semibold text-slate-900 leading-tight dark:text-slate-100";
const CARD_SUB = "text-sm text-slate-500 mt-1 dark:text-slate-400";
const LABEL =
  "block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider dark:text-slate-300";
const FIELD =
  "w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100";
const FIELD_ERROR = "mt-0.5 text-xs font-medium text-rose-600 dark:text-rose-400";
const RADIO_ROW = "flex items-start gap-3.5 p-3.5 rounded-lg cursor-pointer transition-all";
const RADIO = "mt-1 h-4 w-4 text-brand-700 border-slate-300 focus:ring-brand-700";
const RADIO_TITLE = "text-sm font-semibold text-slate-900 dark:text-slate-100";
const CHEVRON = "w-3.5 h-3.5 text-slate-400";

/** The composition's breadcrumb chevron (`M9 5l7 7-7 7`). */
function BreadcrumbChevron(): ReactElement {
  return (
    <svg
      className={CHEVRON}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** The composition's lock icon, used by the read-only email row. */
function LockGlyph({ className }: { className: string }): ReactElement {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function InfoGlyph({ className }: { className: string }): ReactElement {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}

/** DRF field errors → `{field: firstMessage}` for inline rendering. */
function fieldErrors(details: unknown): Record<string, string> {
  if (details === null || typeof details !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
      out[key] = value[0];
    } else if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

interface FormState {
  display_name: string;
  batch: string;
  hiring_type: HiringType;
  region: string;
  expected_joining_date: string;
  public_identity_mode: "ANONYMOUS" | "DISPLAY_NAME";
}

function toForm(profile: CandidateProfilePrivate): FormState {
  return {
    display_name: profile.display_name,
    batch: profile.batch,
    hiring_type: profile.hiring_type,
    region: profile.region,
    expected_joining_date: profile.expected_joining_date ?? "",
    public_identity_mode: profile.public_identity_mode,
  };
}

/** The composition's masked-address form (`a***@example.com`), from the session. */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email.charAt(0)}***${email.slice(at)}`;
}

function memberSince(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

/** The composition's field: its own label markup, then the control. */
function Field({
  id,
  label,
  errorText,
  children,
}: {
  id: string;
  label: string;
  errorText?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {errorText !== undefined && (
        <p className={FIELD_ERROR} role="alert">
          {errorText}
        </p>
      )}
    </div>
  );
}

export function SettingsProfilePage(): ReactElement {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfilePrivate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setForm(toForm(p));
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

  const dirty = useMemo(() => {
    if (profile === null || form === null) return false;
    return JSON.stringify(toForm(profile)) !== JSON.stringify(form);
  }, [profile, form]);

  // Unsaved-changes navigation guard (the plan's acceptance item).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      const proceed = window.confirm(
        "You have unsaved changes. Leave this page without saving?",
      );
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker.state]); // eslint-disable-line react-hooks/exhaustive-deps -- act on transitions only

  // Focus the error summary whenever server-side field errors arrive — inside
  // the render cycle (useEffect), so keyboard/AT users land on the failures.
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      summaryRef.current?.focus();
    }
  }, [errors]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((current) => (current === null ? current : { ...current, [key]: value }));
    setSaved(false);
  };

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (form === null || profile === null) return;
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      // Partial PATCH: send only the fields this screen edits (never
      // current_status — that is the timeline's state machine, not a form).
      // Explicit per-field diff: a union-keyed indexed write defeats TS's
      // correlated-type checking, so each field states its own change.
      const original = toForm(profile);
      const payload: Partial<FormState> = {};
      if (form.display_name !== original.display_name) payload.display_name = form.display_name;
      if (form.batch !== original.batch) payload.batch = form.batch;
      if (form.hiring_type !== original.hiring_type) payload.hiring_type = form.hiring_type;
      if (form.region !== original.region) payload.region = form.region;
      if (form.expected_joining_date !== original.expected_joining_date) {
        payload.expected_joining_date = form.expected_joining_date;
      }
      if (form.public_identity_mode !== original.public_identity_mode) {
        payload.public_identity_mode = form.public_identity_mode;
      }
      const updated = await apiPatch<CandidateProfilePrivate>("/profile/", payload);
      setProfile(updated);
      setForm(toForm(updated));
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError) {
        const inline = fieldErrors(error.details);
        if (Object.keys(inline).length > 0) {
          setErrors(inline);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Could not save. Check your connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const failedFields = Object.keys(errors);

  return (
    <div className="skin-v1 max-w-[1040px] w-full mx-auto font-body antialiased">
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-3 dark:text-slate-400" aria-label="Breadcrumb">
        <Link to="/dashboard" className="hover:text-slate-800 transition-colors dark:hover:text-slate-200">
          Home
        </Link>
        <BreadcrumbChevron />
        <Link to="/settings" className="hover:text-slate-800 transition-colors dark:hover:text-slate-200">
          Settings
        </Link>
        <BreadcrumbChevron />
        <span className="text-brand-700 font-medium dark:text-brand-300">Profile</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight dark:text-slate-100">Profile</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl dark:text-slate-400">
          Keep this accurate — your joining date and category drive your timeline and survey eligibility
        </p>
      </div>

      {loading && <SkeletonCard />}
      {loadFailed && (
        <EmptyState
          headline="Could not load your profile"
          support="The profile service did not respond. Try again in a moment."
        />
      )}

      {form !== null && profile !== null && (
        <form onSubmit={handleSave} noValidate data-testid="profile-form">
          {failedFields.length > 0 && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              data-testid="error-summary"
              className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 focus:outline-none dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <p className="font-semibold">
                {failedFields.length} field{failedFields.length === 1 ? "" : "s"} need attention:
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {failedFields.map((field) => (
                  <li key={field}>{errors[field]}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col lg:flex-row items-start gap-8">
            {/* Left column: the form stack (max 720px, room for the sticky bar). */}
            <div className="w-full lg:max-w-[720px] space-y-6 pb-28">
              <section className={CARD} aria-label="Identity">
                <div className={CARD_HEAD}>
                  <h2 className={CARD_H2}>Identity</h2>
                  <p className={CARD_SUB}>
                    Manage your public candidate moniker, avatar, and linked credentials.
                  </p>
                </div>

                {/* Avatar: its markup is the composition's; the initials are real,
                    and the composition's "Upload photo" button is declared dropped
                    — no API stores an image. */}
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-16 h-16 rounded-full bg-brand-700 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-brand-700/20 shrink-0">
                    {initialsOf(form.display_name)}
                  </div>
                </div>

                <div className="space-y-4">
                  <Field id="profile-name" label="Display name" errorText={errors.display_name}>
                    <input
                      id="profile-name"
                      type="text"
                      value={form.display_name}
                      onChange={(e) => set("display_name", e.target.value)}
                      maxLength={50}
                      className={FIELD}
                      aria-invalid={errors.display_name !== undefined}
                    />
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 dark:text-slate-400">
                      <InfoGlyph className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {form.public_identity_mode === "ANONYMOUS"
                        ? "Hidden — you appear as Anonymous Candidate."
                        : "Shown with your posts and comments."}
                    </p>
                  </Field>

                  {/* The composition's email row: lock icon, "Sign-in identity"
                      caption, disabled masked field, support helper. */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="profile-email"
                        className="block text-xs font-semibold text-slate-700 uppercase tracking-wider dark:text-slate-300"
                      >
                        Email address
                      </label>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <LockGlyph className="w-3.5 h-3.5 text-slate-400" />
                        Sign-in identity
                      </span>
                    </div>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockGlyph className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        id="profile-email"
                        type="text"
                        disabled
                        readOnly
                        data-testid="email-readonly"
                        value={maskEmail(user?.email ?? "")}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-mono cursor-not-allowed select-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 dark:text-slate-400">
                      <InfoGlyph className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      Contact support to change your email — it is your sign-in identity.
                    </p>
                  </div>
                </div>
              </section>

              <section className={CARD} aria-label="Recruitment details">
                <div className={CARD_HEAD}>
                  <h2 className={CARD_H2}>Recruitment details</h2>
                  <p className={CARD_SUB}>
                    These fields match your official letter metadata to benchmark your wait duration.
                  </p>
                </div>

                <div className="space-y-4">
                  <Field id="profile-category" label="Category" errorText={errors.hiring_type}>
                    {/* The composition's control is drawn open; a native select
                        cannot be, so the closed treatment is carried and the
                        options are the backend's real vocabulary. */}
                    <select
                      id="profile-category"
                      value={form.hiring_type}
                      onChange={(e) => set("hiring_type", e.target.value as HiringType)}
                      className={FIELD}
                      aria-invalid={errors.hiring_type !== undefined}
                    >
                      {HIRING_TYPES.map((ht) => (
                        <option key={ht} value={ht}>
                          {HIRING_TYPE_LABELS[ht]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <Field id="profile-date" label="Expected joining date" errorText={errors.expected_joining_date}>
                      <input
                        id="profile-date"
                        type="date"
                        value={form.expected_joining_date}
                        onChange={(e) => set("expected_joining_date", e.target.value)}
                        className={FIELD}
                        aria-invalid={errors.expected_joining_date !== undefined}
                      />
                    </Field>

                    <Field id="profile-region" label="Region" errorText={errors.region}>
                      <input
                        id="profile-region"
                        type="text"
                        value={form.region}
                        onChange={(e) => set("region", e.target.value)}
                        maxLength={100}
                        className={FIELD}
                        aria-invalid={errors.region !== undefined}
                      />
                      <p className="text-xs text-slate-500 mt-1.5 dark:text-slate-400">
                        Free text — e.g. Hyderabad.
                      </p>
                    </Field>

                    <Field id="profile-batch" label="Batch year" errorText={errors.batch}>
                      <select
                        id="profile-batch"
                        value={form.batch}
                        onChange={(e) => set("batch", e.target.value)}
                        className={FIELD}
                        aria-invalid={errors.batch !== undefined}
                      >
                        {["2024", "2025", "2026", "2027"].map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* The composition's amber callout, with the honest copy: the
                      mockup's survey rule has no backend behind it. */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 mt-2 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <svg
                      className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                    <span>
                      Community wait-time metrics are computed from survey, offer and joining-letter
                      event dates. Changing a past date changes the record your timeline shows.
                    </span>
                  </div>
                </div>
              </section>

              <section className={CARD} aria-label="Identity visibility">
                <div className={CARD_HEAD}>
                  {/* The composition's heading ("Timeline visibility") is declared
                      dropped: the API has no per-timeline privacy control, and this
                      card carries `public_identity_mode` instead. */}
                  <h2 className={CARD_H2}>Identity visibility</h2>
                  <p className={CARD_SUB}>
                    Control whether your display name or an anonymous identity appears on your
                    contributions.
                  </p>
                </div>

                <fieldset className="space-y-3">
                  <legend className="sr-only">Who sees your name on your contributions</legend>
                  <label
                    className={`${RADIO_ROW} ${
                      form.public_identity_mode === "ANONYMOUS"
                        ? "border-2 border-brand-700 bg-brand-50/40"
                        : "border border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="public_identity_mode"
                      value="ANONYMOUS"
                      checked={form.public_identity_mode === "ANONYMOUS"}
                      onChange={() => set("public_identity_mode", "ANONYMOUS")}
                      className={RADIO}
                    />
                    <div className="flex-1">
                      <span className={RADIO_TITLE}>Anonymous — appear as “Anonymous Candidate”</span>
                      <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">
                        Other candidates see “Anonymous Candidate” instead of your name on your posts
                        and comments.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`${RADIO_ROW} ${
                      form.public_identity_mode === "DISPLAY_NAME"
                        ? "border-2 border-brand-700 bg-brand-50/40"
                        : "border border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="public_identity_mode"
                      value="DISPLAY_NAME"
                      checked={form.public_identity_mode === "DISPLAY_NAME"}
                      onChange={() => set("public_identity_mode", "DISPLAY_NAME")}
                      className={RADIO}
                    />
                    <div className="flex-1">
                      <span className={RADIO_TITLE}>Show my display name</span>
                      <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                        Your display name appears with your posts and comments.
                      </p>
                    </div>
                  </label>
                </fieldset>
                {errors.public_identity_mode !== undefined && (
                  <p className={FIELD_ERROR} role="alert">
                    {errors.public_identity_mode}
                  </p>
                )}
              </section>
            </div>

            {/* Right column: the 320px help card and the rose danger link. */}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex items-center gap-2 mb-3 text-slate-900 font-semibold text-sm dark:text-slate-100">
                  <InfoGlyph className="w-4 h-4 text-brand-700 dark:text-brand-300" />
                  About this screen
                </div>

                <ul className="space-y-3 text-xs text-slate-600 leading-relaxed dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-700 shrink-0 mt-1.5" />
                    <span>
                      Only the fields the profile API stores can be edited here; the rest of your
                      account is read-only.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-700 shrink-0 mt-1.5" />
                    <span>
                      Your email address is your sign-in identity and is changed through support, not
                      from this form.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-700 shrink-0 mt-1.5" />
                    <span>
                      Editing the joining date or category changes what your timeline shows, because
                      those values feed its milestone record.
                    </span>
                  </li>
                </ul>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span>Updated {memberSince(profile.updated_at)}</span>
                  <span className="text-emerald-600 font-medium flex items-center gap-1 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Loaded from the server
                  </span>
                </div>
              </div>

              <div className="px-1 text-center sm:text-left">
                <Link
                  to="/settings/danger"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline transition-colors dark:text-rose-400 dark:hover:text-rose-300"
                >
                  <svg
                    className="w-3.5 h-3.5 text-rose-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Delete my account instead
                </Link>
              </div>
            </div>
          </div>

          {formError !== null && (
            <p role="alert" className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">
              {formError}
            </p>
          )}
          {saved && !dirty && (
            <p
              role="status"
              data-testid="saved-note"
              className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400"
            >
              Profile saved.
            </p>
          )}

          {/* Sticky action bar (screen #2): Cancel reverts to the saved profile. */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 z-20 py-3 px-4 sm:px-8 shadow-md dark:border-slate-700 dark:bg-slate-900/95">
            <div className="max-w-[1040px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              {dirty ? (
                <div
                  data-testid="unsaved-indicator"
                  className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/70 px-3 py-1.5 rounded-md dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 w-full sm:w-auto justify-center sm:justify-start"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
                  <span>Unsaved changes</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">All changes saved</span>
              )}

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={() => {
                    setForm(toForm(profile));
                    setErrors({});
                    setFormError(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!dirty || saving}
                  aria-busy={saving}
                  className="flex-1 sm:flex-none px-5 py-2 text-xs font-semibold text-white bg-[#0369A1] hover:bg-[#0284C7] rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

/** The strip's initials, from the display name. */
function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}
