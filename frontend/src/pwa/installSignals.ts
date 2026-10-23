/**
 * §10.1's install-promotion triggers (9.4 Task 8), persisted in localStorage.
 *
 * The rule is deliberately conservative — promotion appears only after the
 * visitor has shown real use, never on a first visit:
 *
 *   (a) an account was created AND at least one timeline milestone was added,
 *   (b) the community was visited on 2 distinct days.
 *
 * Each signal is stored at the moment it actually happens (registration, a
 * created timeline event, a community visit), so the rule is evaluated from
 * recorded facts rather than inferred from a session.
 */

export const ACCOUNT_CREATED_KEY = "tjt.install.account_created";
export const MILESTONE_ADDED_KEY = "tjt.install.milestone_added";
export const VISIT_DATES_KEY = "tjt.install.visit_dates";
export const INSTALL_DISMISSED_KEY = "tjt.install.dismissed";

/** How many distinct visit days the second trigger needs. */
export const VISIT_DAYS_REQUIRED = 2;

/** Bound the stored history — the trigger only ever needs a couple of days. */
const MAX_STORED_VISIT_DATES = 10;

function readFlag(key: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(key) === "1";
}

function writeFlag(key: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, "1");
}

export function recordAccountCreated(): void {
  writeFlag(ACCOUNT_CREATED_KEY);
}

export function recordMilestoneAdded(): void {
  writeFlag(MILESTONE_ADDED_KEY);
}

/** The local calendar day, `YYYY-MM-DD` (not UTC — a "day" is the user's day). */
export function localDay(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function visitedDays(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(VISIT_DATES_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    // Corrupt storage is not a reason to hide the banner forever, nor to crash.
    return [];
  }
}

/** Record today's community visit (idempotent within a day, capped in history). */
export function recordCommunityVisit(day: string = localDay()): void {
  if (typeof localStorage === "undefined") return;
  const days = visitedDays();
  if (days.includes(day)) return;
  const next = [...days, day].slice(-MAX_STORED_VISIT_DATES);
  localStorage.setItem(VISIT_DATES_KEY, JSON.stringify(next));
}

export function installTriggerMet(): boolean {
  const accountAndMilestone = readFlag(ACCOUNT_CREATED_KEY) && readFlag(MILESTONE_ADDED_KEY);
  const twoDistinctDays = new Set(visitedDays()).size >= VISIT_DAYS_REQUIRED;
  return accountAndMilestone || twoDistinctDays;
}

export function isInstallDismissed(): boolean {
  return readFlag(INSTALL_DISMISSED_KEY);
}

export function dismissInstallPrompt(): void {
  writeFlag(INSTALL_DISMISSED_KEY);
}
