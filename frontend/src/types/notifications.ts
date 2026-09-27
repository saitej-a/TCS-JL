/**
 * Notifications types (9.4 Task 4): byte-mirrors of 6.2's serializers.
 *
 * `NotificationItem` is `NotificationSerializer` (07 §11.1) — the `post_id`/
 * `comment_id` columns are what a row click navigates from. The list envelope
 * is the standard `Paginated` plus the view's injected top-level
 * `unread_count` (NotificationPagination), which is what the bell feeds on.
 */
import type { Paginated } from "@/types/api";

/** Notification.NotificationType — the closed 6.1 D1 vocabulary. */
export type NotificationType =
  | "COMMENT"
  | "REPLY"
  | "VOTE_MILESTONE"
  | "ANNOUNCEMENT"
  | "MODERATION"
  | "TIMELINE_REMINDER"
  | "SYSTEM";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
}

export interface NotificationListEnvelope extends Paginated<NotificationItem> {
  unread_count: number;
}

export interface NotificationListParams {
  /** The view's `?is_read=` filter ('true' | 'false'); absent = all. */
  is_read?: "true" | "false";
  page?: number;
}

/** `POST /{id}/read/`'s response (NotificationReadView). */
export interface NotificationReadResult {
  id: string;
  is_read: boolean;
  read_at: string | null;
}

/** `POST /read-all/`'s response (NotificationReadAllView). */
export interface NotificationReadAllResult {
  updated_count: number;
  message: string;
}

/** DeviceSerializer (07 §11.4) — the token is never echoed back. */
export interface DeviceInfo {
  id: string;
  device_type: "WEB" | "ANDROID" | "IOS";
  browser: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

/** DeviceWriteSerializer's accepted body; the token is write-only. */
export interface DeviceRegistrationPayload {
  fcm_token: string;
  device_type?: DeviceInfo["device_type"];
  browser?: string;
}
