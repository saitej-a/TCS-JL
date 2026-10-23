/**
 * Whether the shell's right rail currently holds page content.
 *
 * The rail is the shell's (the `app_shell` composition owns the 320px column and
 * its `w-80 border-l p-5 space-y-5` chrome), while its cards belong to whichever
 * page fills it — `RailPortal` is that handshake. A page that renders its own
 * rail inside its own grid (the dashboard composition does exactly this) leaves
 * the shell slot empty, and an empty 320px white column is not part of any
 * composition: the shell hides the column until something is portalled into it.
 */
import { useSyncExternalStore } from "react";

let occupied = false;
const listeners = new Set<() => void>();

export function setRailOccupied(next: boolean): void {
  if (occupied === next) return;
  occupied = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRailOccupied(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => occupied,
    () => false,
  );
}
