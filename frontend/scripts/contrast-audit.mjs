/**
 * 9.5 Task 1 — measured contrast for the v2 brand tokens (WCAG 2.1 relative luminance).
 * Task 13 of 9.5's Phase 12 added the rows for the tinted-chip/pill pairs the
 * whole-tree rebuild introduced, so no new real pair ships unmeasured.
 *
 * Phase 14 Task 1 added the **literal** family: the v1 (indigo) pairs the ported
 * compositions carry verbatim. Those cannot be fixed without repainting the
 * markup, which is the thing Phase 14 exists to stop, so a literal pair below its
 * threshold is allowed to ship **only if it is listed in the phase record**
 * (RECONCILIATION-14.md's accepted table, matched on the audit label). An unlisted
 * literal failure exits non-zero — that is the "no new failure may be left
 * unlisted" rule (D-06), made mechanical rather than remembered.
 *
 * The two pre-existing v2 failures stay as they were: they are documented in
 * 05 §4.1.1 and 12's record, and they are reported, not fixed here.
 *
 * Run: node scripts/contrast-audit.mjs   (dependency-free, mirrors generate-icons.mjs style)
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RECORD_PATH = path.resolve(
  SCRIPT_DIR,
  "..",
  "..",
  ".planning",
  "phases",
  "TCS-JL-14-literal-stitch-markup-in-the-app",
  "RECONCILIATION-14.md",
);
const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = ([r, g, b]) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
// Blend a token over a background at opacity alpha (for /50-style utilities).
const blend = (fg, alpha, bg) =>
  hex(fg).map((c, i) => Math.round(c * alpha + hex(bg)[i] * (1 - alpha)));
// Accept a hex string or a pre-blended [r,g,b] array.
const toRgb = (v) => (Array.isArray(v) ? v : hex(v));
const ratio = (a, b) => {
  const [l1, l2] = [lum(toRgb(a)), lum(toRgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const T = {
  brand700: "#0369a1", brand800: "#075985", brand600: "#0284c7", brand500: "#0ea5e9",
  brand400: "#38bdf8", brand300: "#7dd3fc", brand50: "#f0f9ff", brand950: "#082f49",
  brand200: "#bae6fd", brand100: "#e0f2fe", brand900: "#0c4a6e",
  rose600: "#e11d48", rose700: "#be123c", rose50: "#fff1f2",
  emerald600: "#059669", emerald700: "#047857", emerald50: "#ecfdf5",
  emerald400: "#34d399", sky600: "#0284c7", sky50: "#f0f9ff",
  amber800: "#92400e", amber50: "#fffbeb",
  white: "#ffffff", slate50: "#f8fafc", slate900: "#0f172a", slate800: "#1e293b",
  // Phase 14: the v1 family's palette — Tailwind's defaults, which is what the
  // compositions load (their inline config declares no colors; the CDN build
  // supplies these). Indigo is the v1 brand accent.
  indigo50: "#eef2ff", indigo100: "#e0e7ff", indigo600: "#4f46e5", indigo700: "#4338ca",
  indigo800: "#3730a3", indigo900: "#312e81", violet50: "#f5f3ff", violet600: "#7c3aed",
  amber500: "#f59e0b", amber600: "#d97706", amber700: "#b45309",
  emerald500: "#10b981", sky300: "#7dd3fc", sky400: "#38bdf8",
  slate100: "#f1f5f9", slate300: "#cbd5e1", slate400: "#94a3b8", slate500: "#64748b",
  slate600: "#475569", slate700: "#334155", rose300: "#fda4af", rose950: "#4c0519",
};
const rows = [
  ["LIGHT  primary button (white on brand-700 rest)", ratio(T.white, T.brand700), 4.5],
  ["LIGHT  primary button hover (white on brand-800)", ratio(T.white, T.brand800), 4.5],
  ["LIGHT  link on page bg (brand-700 on slate-50)", ratio(T.brand700, T.slate50), 4.5],
  ["LIGHT  link on surface (brand-700 on white)", ratio(T.brand700, T.white), 4.5],
  ["LIGHT  JOINING_LETTER badge (brand-700 on brand-50)", ratio(T.brand700, T.brand50), 4.5],
  ["LIGHT  focus ring (brand-500 vs white, non-text)", ratio(T.brand500, T.white), 3.0],
  ["DARK   accent text (brand-400 on slate-900)", ratio(T.brand400, T.slate900), 4.5],
  ["DARK   accent text alt (brand-500 on slate-900)", ratio(T.brand500, T.slate900), 4.5],
  ["DARK   brand-700 on slate-900 (forbidden in v2)", ratio(T.brand700, T.slate900), 4.5],
  ["DARK   badge (brand-300 on slate-950-blend brand-950/50)", ratio(T.brand300, blend(T.brand950, 0.5, T.slate900)), 4.5],
  ["DARK   primary button (white on brand-700)", ratio(T.white, T.brand700), 4.5],
  ["DARK   link on surface (brand-400 on slate-800)", ratio(T.brand400, T.slate800), 4.5],
  // Phase 12 (T12/T13): pairs the whole-tree rebuild introduced — the icon
  // chips and tinted pills of the composition anatomy, each measured against
  // its own role (4.5 for text, 3.0 for non-text graphics per WCAG 1.4.11).
  ["LIGHT  error code label (rose-700 on rose-50, text)", ratio(T.rose700, T.rose50), 4.5],
  ["LIGHT  error disc icon (rose-600 on rose-50, non-text)", ratio(T.rose600, T.rose50), 3.0],
  ["LIGHT  icon chip (brand-600 on brand-50, non-text)", ratio(T.brand600, T.brand50), 3.0],
  ["LIGHT  info chip icon (sky-600 on sky-50, non-text)", ratio(T.sky600, T.sky50), 3.0],
  ["LIGHT  success chip icon (emerald-600 on emerald-50, non-text)", ratio(T.emerald600, T.emerald50), 3.0],
  ["LIGHT  success pill text (emerald-700 on emerald-50)", ratio(T.emerald700, T.emerald50), 4.5],
  ["LIGHT  community-reported badge (amber-800 on amber-50)", ratio(T.amber800, T.amber50), 4.5],
  ["DARK   icon chip (brand-600 on brand-900/50 over slate-800, non-text)", ratio(T.brand600, blend(T.brand950, 0.5, T.slate800)), 3.0],
  ["DARK   notice body text (brand-200 on brand-900)", ratio(T.brand200, T.brand900), 4.5],
  ["DARK   k-anonymity chip text (brand-100 on brand-800)", ratio(T.brand100, T.brand800), 4.5],
  ["DARK   lock icon (emerald-400 on brand-900, non-text)", ratio(T.emerald400, T.brand900), 3.0],
  // ---------------------------------------------------------------------------
  // Phase 14 Task 1: the literal v1 pairs the notification center introduces.
  // Fourth field `true` = a pair copied verbatim from the composition; if it is
  // below threshold the label must appear in the record's accepted table.
  // ---------------------------------------------------------------------------
  ["LIGHT  v1 tab label, active (indigo-600 on white)", ratio(T.indigo600, T.white), 4.5, true],
  ["LIGHT  v1 unread pill (indigo-700 on indigo-100)", ratio(T.indigo700, T.indigo100), 4.5, true],
  ["LIGHT  v1 primary action (white on indigo-600)", ratio(T.white, T.indigo600), 4.5, true],
  ["LIGHT  v1 primary action hover (white on indigo-700)", ratio(T.white, T.indigo700), 4.5, true],
  ["LIGHT  v1 secondary action (slate-700 on white)", ratio(T.slate700, T.white), 4.5, true],
  ["LIGHT  v1 notice action (indigo-700 on indigo-50)", ratio(T.indigo700, T.indigo50), 4.5, true],
  ["LIGHT  v1 headline (slate-800 on white)", ratio(T.slate800, T.white), 4.5, true],
  ["LIGHT  v1 body text (slate-600 on white)", ratio(T.slate600, T.white), 4.5, true],
  ["LIGHT  v1 timestamp (slate-400 on white)", ratio(T.slate400, T.white), 4.5, true],
  ["LIGHT  v1 caught-up body (slate-500 on white)", ratio(T.slate500, T.white), 4.5, true],
  ["LIGHT  v1 filter chip, active (slate-900 on white)", ratio(T.slate900, T.white), 4.5, true],
  ["LIGHT  v1 filter chip, idle (slate-600 on slate-100)", ratio(T.slate600, T.slate100), 4.5, true],
  ["LIGHT  v1 category label, amber (amber-600 on white)", ratio(T.amber600, T.white), 4.5, true],
  ["LIGHT  v1 category label, emerald (emerald-700 on white)", ratio(T.emerald700, T.white), 4.5, true],
  ["LIGHT  v1 chip glyph, indigo (indigo-600 on indigo-50, non-text)", ratio(T.indigo600, T.indigo50), 3.0, true],
  ["LIGHT  v1 chip glyph, amber (amber-600 on amber-50, non-text)", ratio(T.amber600, T.amber50), 3.0, true],
  ["LIGHT  v1 chip glyph, violet (violet-600 on violet-50, non-text)", ratio(T.violet600, T.violet50), 3.0, true],
  ["LIGHT  v1 chip glyph, emerald (emerald-600 on emerald-50, non-text)", ratio(T.emerald600, T.emerald50), 3.0, true],
  ["LIGHT  v1 chip glyph, slate (slate-500 on slate-100, non-text)", ratio(T.slate500, T.slate100), 3.0, true],
  ["LIGHT  v1 meta glyph (amber-500 on white, non-text)", ratio(T.amber500, T.white), 3.0, true],
  ["LIGHT  v1 pulse card, headline (white on indigo-900)", ratio(T.white, T.indigo900), 4.5, true],
  ["LIGHT  v1 pulse card, label (sky-300 on indigo-900)", ratio(T.sky300, T.indigo900), 4.5, true],
  ["LIGHT  v1 pulse card, figure (sky-400 on indigo-900)", ratio(T.sky400, T.indigo900), 4.5, true],
  ["LIGHT  v1 pulse card, note (indigo-200/80 on indigo-900)", ratio(blend("#c7d2fe", 0.8, T.indigo900), T.indigo900), 4.5, true],
  ["DARK   v1 headline (white on slate-900)", ratio(T.white, T.slate900), 4.5, true],
  ["DARK   v1 body text (slate-300 on slate-900)", ratio(T.slate300, T.slate900), 4.5, true],
  ["DARK   v1 muted text (slate-400 on slate-900)", ratio(T.slate400, T.slate900), 4.5, true],
  ["DARK   v1 error text (rose-300 on rose-950)", ratio(T.rose300, T.rose950), 4.5, true],
];

/** The record's accepted literal failures, matched on the audit label. */
async function acceptedLabels() {
  if (!existsSync(RECORD_PATH)) return new Set();
  const markdown = await readFile(RECORD_PATH, "utf8");
  const accepted = new Set();
  let inTable = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) {
      inTable = false;
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells[0] === "Pair (audit label)") {
      inTable = true;
      continue;
    }
    if (cells.every((cell) => /^-+$/.test(cell.replace(/:/g, "")) || cell === "")) continue;
    if (inTable) accepted.add(cells[0].replace(/`/g, ""));
  }
  return accepted;
}

const accepted = await acceptedLabels();
console.log("contrast audit (WCAG 2.1, threshold in brackets)");
let fails = 0;
let unlisted = 0;
for (const [label, r, need, literal] of rows) {
  const ok = r >= need;
  const listed = accepted.has(label);
  if (!ok) fails += 1;
  const verdict = ok ? "PASS" : listed ? "ACCEPTED" : "FAIL";
  if (!ok && literal === true && !listed) unlisted += 1;
  console.log(`${verdict}  ${r.toFixed(2)}:1 (need ${need}:1)  ${label}`);
}
console.log(
  fails === 0
    ? "\nAll measured pairs meet their threshold."
    : `\n${fails} pair(s) below threshold — ${[...accepted].length} accepted literal pair(s) listed in RECONCILIATION-14.md.`,
);
if (unlisted > 0) {
  console.error(
    `\n${unlisted} literal pair(s) below threshold and NOT listed in RECONCILIATION-14.md's ` +
      "accepted table — every literal failure must be recorded (D-06).",
  );
  process.exit(1);
}
