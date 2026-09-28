/**
 * 9.5 Task 1 — measured contrast for the v2 brand tokens (WCAG 2.1 relative luminance).
 * Run: node scripts/contrast-audit.mjs   (dependency-free, mirrors generate-icons.mjs style)
 */
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
  brand700: "#0369a1", brand800: "#075985", brand500: "#0ea5e9", brand400: "#38bdf8",
  brand300: "#7dd3fc", brand50: "#f0f9ff", brand950: "#082f49", brand200: "#bae6fd",
  white: "#ffffff", slate50: "#f8fafc", slate900: "#0f172a", slate800: "#1e293b",
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
];
console.log("v2 brand contrast audit (WCAG 2.1, threshold in brackets)");
let fails = 0;
for (const [label, r, need] of rows) {
  const ok = r >= need;
  if (!ok) fails += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2)}:1 (need ${need}:1)  ${label}`);
}
console.log(fails === 0 ? "\nAll measured pairs meet their threshold." : `\n${fails} pair(s) below threshold — see 05 §4.1.1 v2 role rules.`);
