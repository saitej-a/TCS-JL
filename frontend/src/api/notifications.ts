/**
 * Notifications API (07 §11) — the §7.10 center + AppShell bell's data layer.
 *
 * Read shapes mirror `NotificationSerializer` and the pagination envelope with
 * its injected `unread_count`; write shapes mirror the three POST endpoints
 * (read, read-all, device registration). 6.2 owns the backend; this file is
 * the client only. 9.4 Task 8's push subscription registers WEB devices
 * through `registerDevice` — the token column carries the subscription JSON.
 */
import { apiDelete, apiGet, apiPatch, apiPost } from "@/api/client";
import type {
  DeviceInfo,
  DeviceRegistrationPayload,
  NotificationListEnvelope,
  NotificationListParams,
  NotificationReadAllResult,
  NotificationReadResult,
} from "@/types/notifications";

export function listNotifications(
  params: NotificationListParams = {},
): Promise<NotificationListEnvelope> {
  return apiGet<NotificationListEnvelope>("/notifications/", { ...params });
}

export function markNotificationRead(id: string): Promise<NotificationReadResult> {
  return apiPost<NotificationReadResult>(`/notifications/${id}/read/`);
}

export function markAllNotificationsRead(): Promise<NotificationReadAllResult> {
  return apiPost<NotificationReadAllResult>("/notifications/read-all/");
}

export function listDevices(): Promise<DeviceInfo[]> {
  return apiGet<DeviceInfo[]>("/devices/");
}

/** 9.4 D2: the subscription JSON goes in the opaque token column, device_type WEB. */
export function registerDevice(payload: DeviceRegistrationPayload): Promise<DeviceInfo> {
  return apiPost<DeviceInfo>("/devices/", payload);
}

/**
 * Per-candidate push preferences (07 §11.7, 6.2 D13/D14). The six flags gate
 * the PUSH channel only; in-app delivery is not user-controllable.
 */
export interface NotificationPreferences {
  notify_on_comment: boolean;
  notify_on_reply: boolean;
  notify_on_vote_milestone: boolean;
  notify_on_announcements: boolean;
  notify_timeline_reminders: boolean;
  push_enabled: boolean;
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiGet<NotificationPreferences>("/notifications/preferences/");
}

export function patchNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return apiPatch<NotificationPreferences>("/notifications/preferences/", patch);
}

/** Soft revoke (07 §11.6): deactivates; the daily prune is the only deleter. */
export async function deleteDevice(id: string): Promise<void> {
  await apiDelete<unknown>(`/devices/${id}/`);
}
