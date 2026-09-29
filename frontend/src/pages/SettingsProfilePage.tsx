/**
 * /settings/profile (9.5 Task 3, screen #2; Phase 12 reconciliation) — identity
 * + recruitment details + timeline-visibility radios, with a sticky action bar
 * and an unsaved-changes guard.
 *
 * Composition anatomy adopted: cards with bordered section headers + subtitles,
 * uppercase field labels (via the shared Input), the joining-date note as an
 * amber callout, and the save bar's amber "Unsaved changes" pill.
 *
 * Reconciled against the real API (not the mock):
 * - Category options are the backend's HiringType vocabulary (PRIME/DIGITAL/
 *   NINJA/OTHER) from `api/profile.ts` — the mock's category list is fiction.
 * - PATCH /profile/ is partial and returns DRF field errors as
 *   `{field: [messages]}` inside ApiError.details; they render inline under
 *   the named field, with a focused error summary when several fail.
 * - The composition's amber "changing the joining date may re-open the survey"
 *   note has NO backend rule behind it (update_profile clamps nothing, warns
 *   about nothing) — the callout keeps the 9.5 honest copy instead. The
 *   composition's avatar/upload block, cohort visibility radios and "category
 *   badge on posts" checkbox are also omitted: no API fields back them.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";

import { apiPatch } from "@/api/client";
import { ApiError } from "@/api/errors";
import { getProfile, HIRING_TYPES } from "@/api/profile";
import type { CandidateProfilePrivate, HiringType } from "@/api/profile";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SkeletonCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { TYPOGRAPHY } from "@/theme/tokens";
import type { ReactElement } from "react";

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";
const CARD_HEAD = "border-b border-slate-100 p-4 pb-3.5 dark:border-slate-800 sm:p-5 sm:pb-4";
const CARD_BODY = "p-4 pt-4 sm:p-5 sm:pt-4";
const CARD_SUB = "mt-1 text-xs text-slate-500 dark:text-slate-400";

const HIRING_LABELS: Record<HiringType, string> = {
  PRIME: "TCS Prime",
  DIGITAL: "TCS Digital",
  NINJA: "TCS Ninja",
  OTHER: "Other",
};

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

export function SettingsProfilePage(): ReactElement {
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
    <SettingsLayout
      title="Profile information"
      description="How you appear to the community and where you are in the TCS process."
    >
      {loading && <SkeletonCard />}
      {loadFailed && (
        <EmptyState
          headline="Could not load your profile"
          support="The profile service did not respond. Try again in a moment."
        />
      )}
      {form !== null && profile !== null && (
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          {failedFields.length > 0 && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              data-testid="error-summary"
              className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 focus:outline-none dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
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

          <section className={CARD} aria-label="Identity">
            <div className={CARD_HEAD}>
              <h2 className={TYPOGRAPHY.cardTitle}>Identity</h2>
              <p className={CARD_SUB}>How you appear to the community.</p>
            </div>
            <div className={`${CARD_BODY} grid gap-3 sm:grid-cols-2`}>
              <Input
                label="Display name"
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                errorText={errors.display_name}
                helperText={
                  form.public_identity_mode === "ANONYMOUS"
                    ? "Hidden — you appear as Anonymous Candidate."
                    : "Shown with your posts and comments."
                }
                maxLength={50}
              />
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email</span>
                <p
                  data-testid="email-readonly"
                  className="mt-1 flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 font-mono text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                >
                  Email is your sign-in identity and cannot be changed here.
                </p>
              </div>
            </div>
          </section>

          <section className={CARD} aria-label="Recruitment details">
            <div className={CARD_HEAD}>
              <h2 className={TYPOGRAPHY.cardTitle}>Recruitment details</h2>
              <p className={CARD_SUB}>
                These fields match your official letter metadata to benchmark your wait duration.
              </p>
            </div>
            <div className={`${CARD_BODY} grid gap-3 sm:grid-cols-2`}>
              <div>
                <label
                  htmlFor="sp-batch"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Batch year
                </label>
                <select
                  id="sp-batch"
                  value={form.batch}
                  onChange={(e) => set("batch", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  {["2024", "2025", "2026", "2027"].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.batch !== undefined && (
                  <p className="mt-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.batch}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="sp-hiring"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Category
                </label>
                {/* The backend's real vocabulary — verified, not the mock's list. */}
                <select
                  id="sp-hiring"
                  value={form.hiring_type}
                  onChange={(e) => set("hiring_type", e.target.value as HiringType)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  {HIRING_TYPES.map((ht) => (
                    <option key={ht} value={ht}>
                      {HIRING_LABELS[ht]}
                    </option>
                  ))}
                </select>
                {errors.hiring_type !== undefined && (
                  <p className="mt-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.hiring_type}</p>
                )}
              </div>
              <Input
                label="Region"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                errorText={errors.region}
                helperText="Free text — e.g. Hyderabad."
                maxLength={100}
              />
              <Input
                label="Expected joining date"
                type="date"
                value={form.expected_joining_date}
                onChange={(e) => set("expected_joining_date", e.target.value)}
                errorText={errors.expected_joining_date}
              />
            </div>
            {/* Composition's amber callout, honest copy (no survey rule exists). */}
            <div className="col-span-full mt-1 flex items-start gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <span aria-hidden="true" className="mt-0.5">⚠️</span>
              <span>
                Community wait-time metrics are computed from survey, offer and joining-letter
                event dates. Changing a past date changes the record your timeline shows.
              </span>
            </div>
          </section>

          <section className={CARD} aria-label="Timeline visibility">
            <div className={CARD_HEAD}>
              <h2 className={TYPOGRAPHY.cardTitle}>Timeline visibility</h2>
              <p className={CARD_SUB}>Control who can inspect your milestone pacing.</p>
            </div>
            <fieldset className={`${CARD_BODY} space-y-2`}>
              <legend className="sr-only">Who can see your timeline activity</legend>
              <label
                className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  form.public_identity_mode === "ANONYMOUS"
                    ? "border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200"
                    : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="public_identity_mode"
                  value="ANONYMOUS"
                  checked={form.public_identity_mode === "ANONYMOUS"}
                  onChange={() => set("public_identity_mode", "ANONYMOUS")}
                  className="h-4 w-4"
                />
                Anonymous — appear as “Anonymous Candidate”
              </label>
              <label
                className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  form.public_identity_mode === "DISPLAY_NAME"
                    ? "border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200"
                    : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="public_identity_mode"
                  value="DISPLAY_NAME"
                  checked={form.public_identity_mode === "DISPLAY_NAME"}
                  onChange={() => set("public_identity_mode", "DISPLAY_NAME")}
                  className="h-4 w-4"
                />
                Show my display name
              </label>
            </fieldset>
            {errors.public_identity_mode !== undefined && (
              <p className="mt-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.public_identity_mode}
              </p>
            )}
          </section>

          {formError !== null && (
            <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {formError}
            </p>
          )}
          {saved && !dirty && (
            <p role="status" data-testid="saved-note" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Profile saved.
            </p>
          )}

          {/* Sticky action bar (screen #2): Cancel reverts to the saved profile. */}
          <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              {dirty ? (
                <span
                  data-testid="unsaved-indicator"
                  className="inline-flex items-center gap-2 rounded-md border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">All changes saved</span>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!dirty || saving}
                  onClick={() => {
                    setForm(toForm(profile));
                    setErrors({});
                    setFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </SettingsLayout>
  );
}
