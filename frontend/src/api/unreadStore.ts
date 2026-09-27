/**
 * The shared unread-notification count (9.4 Task 7).
 *
 * §7.10 has two views of one number: the page's header/tabs and the AppShell
 * bell's badge. The project has no react-query (D8: no data-fetching library),
 * so this is the same shape `tokenStore` already uses — module-level state plus
 * a subscriber set — and React reads it through `useSyncExternalStore`.
 *
 * The API stays the authority: both views publish what the server reported
 * (`unread_count`), and a mark-read/mark-all optimistically moves the number so
 * the bell never lags the row the user just clicked.
 */
import { useSyncExternalStore } from "react";

let unread = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getUnreadCount(): number {
  return unread;
}

/**
 * Publish a count. Clamped at 0 (a bell never shows a negative badge) and
 * non-finite values are ignored (a malformed payload must not paint "NaN").
 */
export function setUnreadCount(value: number): void {
  if (!Number.isFinite(value)) return;
  const next = Math.max(0, Math.trunc(value));
  if (next === unread) return;
  unread = next;
  emit();
}

/** Optimistic decrement after a single row is marked read. */
export function decrementUnread(by = 1): void {
  setUnreadCount(unread - by);
}

/** Subscribe for `useSyncExternalStore` and the tests' direct reads. */
export function subscribeUnread(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React binding: re-renders the caller whenever the count changes. */
export function useUnreadCount(): number {
  return useSyncExternalStore(subscribeUnread, getUnreadCount, getUnreadCount);
}
