/**
 * The §7.7 create-post form as a Modal.tsx content component (Phase 12
 * D-03), rebuilt to the `create_community_discussion_post_modal`
 * composition: uppercase field labels, live character counters, a category
 * select over the real D7 vocabulary, the posting-as identity preview, and
 * the Esc-hint footer with Cancel/Publish.
 *
 * Behavior contracts (moved verbatim from the former page): client-side
 * required/length checks pre-validate; the server's two writer rejections
 * render **distinctly**:
 *
 * - `scam_pattern_detected` — the text was blocked by 8.1's scanner. The copy
 *   never implies "try rewording": posting variations of scam text is what
 *   the scanner exists to stop.
 * - `duplicate_post` — 8.1 D6's 60-minute debounce on (title, body) hashes.
 *   The copy names the window so the delay is legible.
 *
 * The composition's "Encrypted Hash Verified" chip and "Markdown supported"
 * line are mock fiction (the API does neither) and are not copied.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { createCommunityPost } from "@/api/community";
import { ApiError } from "@/api/errors";
import { getProfile } from "@/api/profile";
import { Button } from "@/components/Button";
import { ANONYMOUS_SENTINEL } from "@/components/IdentityPill";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Textarea } from "@/components/Textarea";
import { POST_CATEGORIES } from "@/content/postCategories";
import { CATEGORY_LABELS } from "@/theme/badges";

const TITLE_MAX = 200;
const BODY_MAX = 5000;

/** §7.7's "Posting as:" preview, built from the viewer's own profile. */
function identityPreviewLabel(profile: {
  display_name: string;
  public_identity_mode: "ANONYMOUS" | "DISPLAY_NAME";
  batch: string;
  hiring_type: string;
  region: string;
}): { handle: string; anonymous: boolean } {
  const anonymous = profile.public_identity_mode === "ANONYMOUS" || profile.display_name.trim() === "";
  const cohort = [profile.batch, profile.hiring_type, profile.region]
    .filter((part) => part !== "")
    .join(" • ");
  const handle = anonymous ? ANONYMOUS_SENTINEL : profile.display_name;
  return { handle: cohort === "" ? handle : `${handle} • ${cohort}`, anonymous: anonymous };
}

const SCAM_COPY =
  "This post was blocked by our anti-scam screening. The text matches patterns we do not allow in the community.";
const DUPLICATE_COPY =
  "You already posted this within the last 60 minutes. Duplicate posts are debounced to keep the feed readable.";

export interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a 201; the parent navigates back to the feed. */
  onPublished: () => void;
}

export function CreatePostModal({ open, onClose, onPublished }: CreatePostModalProps): React.ReactElement {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>(POST_CATEGORIES[0] ?? "GENERAL");
  const [clientError, setClientError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [identity, setIdentity] = useState<{ handle: string; anonymous: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    // Fresh form per open; identity preview fetched per open (membership of
    // the modal means the profile may have changed since mount).
    setTitle("");
    setBody("");
    setCategory(POST_CATEGORIES[0] ?? "GENERAL");
    setClientError(null);
    setBlocked(null);
    setSaving(false);
    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (!cancelled) setIdentity(identityPreviewLabel(profile));
      })
      .catch(() => {
        // No profile yet (the wizard's first visit) or the read failed: the
        // preview is a courtesy, so it simply does not render.
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setClientError(null);
    setBlocked(null);

    if (title.trim() === "") {
      setClientError("A title is required.");
      return;
    }
    if (title.length > TITLE_MAX) {
      setClientError(`Keep the title under ${TITLE_MAX} characters.`);
      return;
    }
    if (body.trim() === "") {
      setClientError("The post body is required.");
      return;
    }
    if (body.length > BODY_MAX) {
      setClientError(`Keep the body under ${BODY_MAX} characters.`);
      return;
    }

    setSaving(true);
    try {
      await createCommunityPost({ title: title.trim(), body: body.trim(), category: category });
      onPublished();
    } catch (error) {
      if (error instanceof ApiError && error.code === "scam_pattern_detected") {
        setBlocked(SCAM_COPY);
      } else if (error instanceof ApiError && error.code === "duplicate_post") {
        setBlocked(DUPLICATE_COPY);
      } else {
        setBlocked("Your post could not be published. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Community Discussion Post">
      <form onSubmit={(e) => void handleSubmit(e)} className="skin-v1 space-y-5 font-body" noValidate data-testid="create-post-modal">
        <div>
          <Input
            label="TITLE *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            required
            placeholder="e.g. Anyone from Hyderabad received the JL email today?"
          />
          <p className="mt-1 text-right text-xs text-slate-400 dark:text-slate-500">
            {title.length} / {TITLE_MAX} characters
          </p>
        </div>

        <div>
          <label
            htmlFor="create-post-category"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Category *
          </label>
          <select
            id="create-post-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 dark:border-slate-600 dark:bg-slate-900"
          >
            {POST_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]} ({key})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Textarea
            label="DISCUSSION BODY *"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX}
            required
            rows={6}
            placeholder="Provide context, batch details, and relevant dates without sharing personal identifiers..."
          />
          <p className="mt-1 text-right text-xs text-slate-400 dark:text-slate-500">
            {body.length} / {BODY_MAX.toLocaleString()} characters
          </p>
        </div>

        {identity !== null && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
              <span className="material-symbols-outlined text-[16px] text-slate-500" data-icon="theater_comedy">
                theater_comedy
              </span>
              <span>Posting as:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{identity.handle}</span>
            </p>
            {identity.anonymous && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                To post with your display name instead, update your{" "}
                <Link to="/settings/privacy" className="text-indigo-600 hover:underline dark:text-indigo-400 font-medium">
                  Privacy Settings
                </Link>
                .
              </p>
            )}
          </div>
        )}

        {clientError !== null && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {clientError}
          </p>
        )}
        {blocked !== null && (
          <div
            role="alert"
            className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {blocked}
          </div>
        )}

        {/* The composition's footer: Esc hint left, Cancel/Publish right. */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Esc
            </kbd>
            <span>to close</span>
          </span>
          <span className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Publish Post
            </Button>
          </span>
        </div>
      </form>
    </Modal>
  );
}
