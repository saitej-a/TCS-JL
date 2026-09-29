/**
 * /admin/announcements (9.5 Task 9 — screen #7). Built on the real 8.2
 * announcement contract, with every divergence from the plan's mock recorded:
 *
 * - Composer creates a DRAFT (POST /announcements/ always does, 04 §73).
 *   Publication is the explicit publish() transition — a preview step then a
 *   confirm dialog precede the PATCH that dispatches the broadcast exactly
 *   once (idempotent False→True).
 * - The mock's audience selector, send-now vs schedule, and per-announcement
 *   reach figures do not exist server-side; the push note states the same
 *   honesty rule as Task 5 (delivery depends on each candidate's devices and
 *   quiet hours). The one real "scheduling" field is `expires_at` — the
 *   hourly task unpublishes the row once it lapses (auto-hide, not send-later).
 * - There is no staff list endpoint, so the published list IS the public feed
 *   (GET /announcements/); drafts live only in this session's state and are
 *   labelled as such. A "sent vs scheduled" distinction in mock terms is
 *   impossible — published rows show their published_at stamp, and expiry is
 *   shown as the auto-hide time instead.
 * - `created_by` is never rendered: staff identity is not community-visible
 *   (AnnouncementPublicSerializer's docstring) and the staff payload keeps it
 *   that way.
 */
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { TYPOGRAPHY } from "@/theme/tokens";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncementsStaff,
  publishAnnouncement,
  type AnnouncementStaff,
} from "@/api/announcements";

const TITLE_MAX = 255; // model CharField(max_length=255)

const PUSH_NOTE =
  "Publishing queues a push broadcast for the announcement. Actual delivery depends on each candidate's devices, their notification preferences, and quiet hours — publishing cannot force a delivery.";

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";

const LABEL =
  "block text-sm font-medium text-slate-900 dark:text-slate-100";

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

function formatWhen(iso: string | null): string {
  return iso === null ? "—" : new Date(iso).toLocaleString();
}

interface ComposerState {
  title: string;
  body: string;
  isPinned: boolean;
  expiresAt: string; // datetime-local value, "" = never
}

const EMPTY_COMPOSER: ComposerState = { title: "", body: "", isPinned: false, expiresAt: "" };

/** datetime-local → ISO with seconds (naive local time is what the field holds). */
function toIsoOr(value: string, fallback: string | null): string | null {
  if (value === "") return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

export function AdminAnnouncementsPage(): ReactElement {
  const { toast } = useToast();
  const [published, setPublished] = useState<AnnouncementStaff[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Drafts have no list endpoint — they exist only in this session's state.
  const [drafts, setDrafts] = useState<AnnouncementStaff[]>([]);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [previewing, setPreviewing] = useState<ComposerState | null>(null);
  const [confirming, setConfirming] = useState<AnnouncementStaff | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPublished = useCallback(async (): Promise<void> => {
    setLoadError(false);
    try {
      const envelope = await listAnnouncementsStaff();
      setPublished(envelope.results);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void loadPublished();
  }, [loadPublished]);

  /** Preview step first (the plan's gate before any network write). */
  function openPreview(): void {
    setFormError(null);
    if (composer.title.trim() === "" || composer.body.trim() === "") {
      setFormError("Title and body are required before you can preview.");
      return;
    }
    if (composer.title.length > TITLE_MAX) {
      setFormError(`Title must be ${TITLE_MAX} characters or fewer.`);
      return;
    }
    setPreviewing(composer);
  }

  async function createDraft(): Promise<void> {
    if (previewing === null) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const draft = await createAnnouncement({
        title: previewing.title.trim(),
        body: previewing.body.trim(),
        is_pinned: previewing.isPinned,
        expires_at: toIsoOr(previewing.expiresAt, null),
      });
      setDrafts((prev) => [draft, ...prev]);
      setComposer(EMPTY_COMPOSER);
      setPreviewing(null);
      toast({
        message: "Draft saved. Publish it below when you are ready to broadcast.",
        variant: "success",
      });
    } catch {
      setFormError("The draft could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function publish(draft: AnnouncementStaff): Promise<void> {
    setSubmitting(true);
    try {
      const updated = await publishAnnouncement(draft.id);
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setConfirming(null);
      toast({ message: "Published — the broadcast has been dispatched.", variant: "success" });
      void loadPublished();
    } catch {
      toast({ message: "Publishing failed. The draft is unchanged.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(draft: AnnouncementStaff): Promise<void> {
    setSubmitting(true);
    try {
      await deleteAnnouncement(draft.id);
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setConfirming(null);
      toast({ message: "Draft deleted.", variant: "success" });
    } catch {
      toast({ message: "The draft could not be deleted. Please try again.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6" data-testid="admin-announcements">
      <nav aria-label="Back">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          <span aria-hidden="true">←</span> Back to dashboard
        </a>
      </nav>
      <header className="space-y-1">
        <h1 className={TYPOGRAPHY.pageTitle}>Announcements</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Drafts, then a deliberate publish. Every publish dispatches one push broadcast.
        </p>
      </header>

      {/* Composer */}
      <section className={`${CARD} p-4 sm:p-5 space-y-3`} aria-label="Compose announcement">
        <h2 className={TYPOGRAPHY.cardTitle}>Compose</h2>
        <div>
          <label htmlFor="ann-title" className={LABEL}>
            Title
          </label>
          <input
            id="ann-title"
            data-testid="ann-title"
            value={composer.title}
            maxLength={TITLE_MAX}
            onChange={(e) => setComposer((c) => ({ ...c, title: e.target.value }))}
            className={INPUT}
            placeholder="What happened, and who needs to know"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500" aria-live="polite">
            {composer.title.length}/{TITLE_MAX} characters
          </p>
        </div>
        <div>
          <label htmlFor="ann-body" className={LABEL}>
            Body
          </label>
          <textarea
            id="ann-body"
            data-testid="ann-body"
            value={composer.body}
            rows={5}
            onChange={(e) => setComposer((c) => ({ ...c, body: e.target.value }))}
            className={INPUT}
            placeholder="Announcement text — plain text, no formatting"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-expires" className={LABEL}>
              Auto-hide after (optional)
            </label>
            <input
              id="ann-expires"
              data-testid="ann-expires"
              type="datetime-local"
              value={composer.expiresAt}
              onChange={(e) => setComposer((c) => ({ ...c, expiresAt: e.target.value }))}
              className={INPUT}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The announcement disappears after this time. This is the only scheduling the API
              supports — there is no send-later option.
            </p>
          </div>
          <div className="flex items-end">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="ann-pinned"
                checked={composer.isPinned}
                onChange={(e) => setComposer((c) => ({ ...c, isPinned: e.target.checked }))}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Pin to the top of the feed
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Pinned announcements render as a sticky banner.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* The honesty rule (Task 5's, restated for broadcast): */}
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
          {PUSH_NOTE}
        </p>

        {formError !== null && (
          <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
            {formError}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            data-testid="ann-preview"
            onClick={openPreview}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Preview
          </button>
        </div>
      </section>

      {/* Session drafts */}
      {drafts.length > 0 && (
        <section aria-label="Session drafts" className="space-y-3">
          <h2 className={TYPOGRAPHY.cardTitle}>
            Drafts (this session only)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            There is no staff draft list in the API — drafts you create appear here until you
            leave this page or delete them.
          </p>
          {drafts.map((draft) => (
            <article key={draft.id} className={`${CARD} p-4`} data-testid="draft-row">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                    draft.is_published
                      ? "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-900"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60"
                  }`}
                >
                  {draft.is_published ? "Published" : "Draft"}
                </span>
                {draft.is_pinned && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    Pinned
                  </span>
                )}
                {draft.expires_at !== null && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    auto-hides {formatWhen(draft.expires_at)}
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{draft.title}</h3>
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                {draft.body}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!draft.is_published && (
                  <button
                    type="button"
                    data-testid={`publish-${draft.id}`}
                    disabled={submitting}
                    onClick={() => setConfirming(draft)}
                    className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                  >
                    Publish…
                  </button>
                )}
                <button
                  type="button"
                  data-testid={`delete-${draft.id}`}
                  disabled={submitting}
                  onClick={() => void remove(draft)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Published list (the public feed — no staff list exists) */}
      <section aria-label="Published announcements" className="space-y-3">
        <h2 className={TYPOGRAPHY.cardTitle}>Published</h2>
        {published === null && !loadError && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        {loadError && (
          <div className={CARD} data-testid="announcements-error">
            <p className="p-4 text-sm text-slate-600 dark:text-slate-300">
              Could not load the published list. Please try again.
            </p>
          </div>
        )}
        {published !== null && published.length === 0 && (
          <EmptyState
            headline="Nothing published yet"
            support="Published announcements appear here for everyone in the community."
          />
        )}
        {published !== null && published.length > 0 && (
          <ul className="space-y-3" data-testid="published-list">
            {published.map((a) => (
              <li key={a.id} className={`${CARD} p-4`} data-testid="published-row">
                <div className="flex flex-wrap items-center gap-2">
                  {a.is_pinned && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-900">
                      Pinned
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    published {formatWhen(a.published_at)}
                  </span>
                  {a.expires_at !== null && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      auto-hides {formatWhen(a.expires_at)}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{a.title}</h3>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                  {a.body}
                </p>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Reach figures are not tracked by the API, so they are not shown.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Preview modal (before any network write) */}
      {previewing !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Preview announcement"
          data-testid="preview-dialog"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <h2 className={TYPOGRAPHY.cardTitle}>Preview</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Saving creates a draft. Nothing is broadcast until you publish it.
            </p>
            <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
              {previewing.isPinned && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-900">
                  Pinned
                </span>
              )}
              <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
                {previewing.title.trim()}
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                {previewing.body.trim()}
              </p>
              {previewing.expiresAt !== "" && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  auto-hides {formatWhen(toIsoOr(previewing.expiresAt, null))}
                </p>
              )}
            </div>
            {formError !== null && (
              <p role="alert" className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                {formError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                data-testid="preview-cancel"
                onClick={() => setPreviewing(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Keep editing
              </button>
              <button
                type="button"
                data-testid="preview-save"
                disabled={submitting}
                onClick={() => void createDraft()}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save as draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish confirm — the deliberate broadcast gate */}
      {confirming !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Publish ${confirming.title}`}
          data-testid="publish-dialog"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <h2 className={TYPOGRAPHY.cardTitle}>Publish this announcement?</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              “{confirming.title}” will go to the community now, and one push broadcast will be
              dispatched for it.
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{PUSH_NOTE}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                data-testid="publish-cancel"
                onClick={() => setConfirming(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Not yet
              </button>
              <button
                type="button"
                data-testid="publish-confirm"
                disabled={submitting}
                onClick={() => void publish(confirming)}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {submitting ? "Publishing…" : "Publish now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
