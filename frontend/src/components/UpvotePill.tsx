/**
 * The §6.8 upvote pill (9.3's UI-03 requirement). The pill is **controlled** —
 * the feed owns each card's committed `voted`/`count` — so a rollback can
 * never desync a list. The pill only overlays an *optimistic* display while a
 * request is in flight:
 *
 * 1. Optimistic: the count flips immediately and the pill pulses
 *    before the request resolves (§6.8's micro-interaction).
 * 2. Reconcile: the server's `has_voted` / `vote_count` (D3's fields) commit
 *    back to the feed and the overlay clears.
 * 3. 409 `already_voted`: the vote exists server-side — commit voted=true with
 *    the optimistic count. Never a failure, never a rollback.
 * 4. Any other failure: the overlay clears (count AND toggle roll back to the
 *    feed's committed values) and a §6.7.1 error toast fires.
 */
import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/api/errors";
import { useToast } from "@/components/Toast";

/** §6.8's exact class sets with Emil Kowalski custom ease-out and tabular numerals. */
const IDLE_CLASSES =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold tabular-nums hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 dark:hover:bg-brand-950/60 dark:hover:border-brand-700 dark:hover:text-brand-300 active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]";
const ACTIVE_CLASSES =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/80 border border-brand-500 text-brand-700 dark:text-brand-400 text-xs font-semibold tabular-nums active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]";

export interface CommitVote {
  voted: boolean;
  count: number;
}

export interface UpvotePillProps {
  /** Committed state from the feed's per-card store. */
  voted: boolean;
  count: number;
  /** Tombstoned posts, locked threads, or anonymous visitors: no voting. */
  disabled?: boolean;
  disabledReason?: string;
  /** Perform the API call. Resolves with the server's reconciliation shape. */
  request: (next: boolean) => Promise<{ has_voted?: boolean; vote_count?: number } | void>;
  /** Report the reconciled outcome back to the feed's per-card state. */
  onCommit: (commit: CommitVote) => void;
  className?: string;
  controlClassName?: string;
  activeControlClassName?: string;
}

const PULSE_MS = 150;

export function UpvotePill({
  voted,
  count,
  disabled = false,
  disabledReason,
  request,
  onCommit,
  className = "",
  controlClassName,
  activeControlClassName,
}: UpvotePillProps): React.ReactElement {
  const { toast } = useToast();
  const [override, setOverride] = useState<CommitVote | null>(null);
  const [pulse, setPulse] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pulseTimer.current !== null) clearTimeout(pulseTimer.current);
    };
  }, []);

  const shownVoted = override !== null ? override.voted : voted;
  const shownCount = override !== null ? override.count : count;

  async function handleClick(): Promise<void> {
    if (disabled || inFlight) return;
    const next = !voted;
    const optimisticCount = count + (next ? 1 : -1);
    setOverride({ voted: next, count: optimisticCount });
    setInFlight(true);
    setPulse(true);
    if (pulseTimer.current !== null) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(false), PULSE_MS);
    try {
      const result = await request(next);
      onCommit({
        voted: result?.has_voted ?? next,
        count: result?.vote_count ?? optimisticCount,
      });
      setOverride(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === "already_voted") {
        onCommit({ voted: true, count: optimisticCount });
        setOverride(null);
      } else {
        setOverride(null);
        toast({
          message: "Your vote could not be saved. Please try again.",
          variant: "error",
        });
      }
    } finally {
      setInFlight(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled}
      aria-pressed={shownVoted}
      aria-busy={inFlight}
      title={disabled ? disabledReason : undefined}
      className={[
        shownVoted
          ? (activeControlClassName ?? ACTIVE_CLASSES)
          : (controlClassName ?? IDLE_CLASSES),
        pulse ? "scale-105" : "",
        disabled ? "cursor-not-allowed opacity-50" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span aria-hidden="true">▲</span>
      {shownVoted ? "Upvoted" : "Upvote"}
      <span aria-hidden="true">|</span>
      <span className="tabular-nums">{shownCount}</span>
    </button>
  );
}
