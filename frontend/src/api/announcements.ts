/**
 * Public announcements (04 §72) — feeds the §5.5 shell banner (D3).
 * Public read shape: {id, title, body, is_pinned, published_at, expires_at};
 * the list endpoint is anonymous-readable and only ever returns published,
 * unexpired rows (server-enforced). NOTE (verification finding): the real
 * route is `/announcements/` — 04 §72's path — not `/community/announcements/`
 * (that URL 404s; the plan's context file guessed the community prefix).
 */
import { apiDelete, apiGet, apiPatch, apiPost } from "@/api/client";
import type { Paginated } from "@/types/api";

export interface AnnouncementPublic {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
}

export function listAnnouncements(): Promise<Paginated<AnnouncementPublic>> {
  return apiGet<Paginated<AnnouncementPublic>>("/announcements/");
}

/**
 * Staff-side surface (9.5 Task 9). The write endpoint (04 §73) ALWAYS creates
 * a draft — `POST /announcements/` has no is_published field; publication is
 * the separate `publish()` transition, triggered by PATCHing `is_published:
 * true` (the view routes that through `publish()` so the broadcast dispatches
 * exactly once and never on later edits). Staff responses add `is_published`
 * to the public shape (`_announcement_payload`).
 *
 * Divergences from the 9.5 plan's mock, verified against the shipped backend:
 * - No audience selector and no send-later/schedule field exist. The only
 *   "scheduling" is `expires_at` (auto-hide after a moment in time).
 * - No reach figures are tracked anywhere in the API.
 * - There is no staff list endpoint; the published list below is the public
 *   feed (drafts are therefore session-local on this screen).
 */
export interface AnnouncementStaff extends AnnouncementPublic {
  is_published: boolean;
}

export interface AnnouncementDraftInput {
  title: string;
  body: string;
  is_pinned: boolean;
  expires_at: string | null;
}

export function createAnnouncement(input: AnnouncementDraftInput): Promise<AnnouncementStaff> {
  return apiPost<AnnouncementStaff>("/announcements/", input);
}

/** The single sanctioned publish trigger (broadcast dispatches here, once). */
export function publishAnnouncement(id: string): Promise<AnnouncementStaff> {
  return apiPatch<AnnouncementStaff>(`/announcements/${id}/`, { is_published: true });
}

/** §75 permits real deletion; the backend keeps the audit line in its log. */
export function deleteAnnouncement(id: string): Promise<void> {
  return apiDelete<void>(`/announcements/${id}/`);
}

/**
 * The same public endpoint typed for staff use: rows are published by server
 * guarantee, so `is_published` is true for every row (the staff payload adds
 * the flag, the public one omits it — same wire data).
 */
export function listAnnouncementsStaff(): Promise<Paginated<AnnouncementStaff>> {
  return apiGet<Paginated<AnnouncementStaff>>("/announcements/");
}
