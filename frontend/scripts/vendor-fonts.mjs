#!/usr/bin/env node
/**
 * Vendors the typefaces the Stitch compositions name (Phase 14 D-04).
 *
 * The compositions load Inter, Fira Sans, Fira Code and Material Symbols from
 * Google's CDN. The app may not: it promises privacy (no third-party request on
 * page load) and offline (the PWA must render the literal typefaces with the
 * network off), so every face is downloaded once and served from our origin.
 *
 * Subsetting is Google's own API rather than a local toolchain — this machine
 * has `curl` and no `fontTools`/`pyftsubset`:
 *   - text families: only the `latin` slice is kept (the content is English,
 *     and that slice already carries the em dash and curly quotes the copy uses);
 *   - the icon font: `&icon_names=<every glyph the library references>`, so the
 *     vendored face carries exactly the ligatures the compositions use and
 *     nothing else (the name list is read from the compositions themselves).
 *
 * Re-run after adding a composition glyph: `node scripts/vendor-fonts.mjs`
 * (writes `public/fonts/*.woff2` + `src/styles/fonts.css`).
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(SCRIPT_DIR, "..");
const DESIGNS_DIR = path.join(FRONTEND_DIR, "stitch designs");
const OUT_DIR = path.join(FRONTEND_DIR, "public", "fonts");
const CSS_OUT = path.join(FRONTEND_DIR, "src", "styles", "fonts.css");

/** A modern desktop UA — Google serves woff2 only to browsers that ask nicely. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * The composition families' own subsets this app renders (D-03's two skins),
 * narrowed to the weights the library actually asks for — measured over the 45
 * documents: 400/500/600/700 plus font-extrabold (800) and font-black (900) in
 * the v1 family; the v2 family stops at 700. font-light/font-thin appear nowhere.
 */
const TEXT_FAMILIES = [
  { label: "inter", query: "Inter:wght@400;500;600;700;800;900" },
  { label: "fira-sans", query: "Fira+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400" },
  { label: "fira-code", query: "Fira+Code:wght@400;500" },
];

const ICON_QUERY =
  "Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";

/** The only text subset worth shipping: the content is English. */
const KEEP_SUBSETS = new Set(["latin"]);

async function get(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response;
}

const getText = async (url) => (await get(url)).text();
const getBinary = async (url) => Buffer.from(await (await get(url)).arrayBuffer());

/**
 * Every glyph name the library references — data-icon attributes and the
 * material-symbols span bodies alike (the union is 127 names; a data-icon-only
 * scan misses the ones carried in modifier-class spans).
 */
async function compositionIconNames() {
  const folders = await readdir(DESIGNS_DIR, { withFileTypes: true });
  const names = new Set();
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const file = path.join(DESIGNS_DIR, folder.name, "code.html");
    if (!existsSync(file)) continue;
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/data-icon="([a-z_]+)"/g)) names.add(match[1]);
    for (const match of html.matchAll(/material-symbols-outlined[^>]*>([a-z_]+)</g)) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

/** The `latin` slice plus whatever else it clearly is, from the unicode-range. */
function detectSubset(declarations) {
  const range = (declarations.match(/unicode-range:\s*([^;]+)/) ?? [])[1] ?? "";
  if (range.includes("U+0000-00FF")) return "latin";
  if (range.includes("U+0100-02BA") || range.includes("U+0100-024F")) return "latin-ext";
  const first = (range.match(/U\+([0-9A-F]+)/) ?? [])[1] ?? "other";
  return `other-${first}`;
}

/**
 * Turn one Google stylesheet into local @font-face rules: download each
 * referenced file, rewrite the URL, keep only the slices we want.
 */
async function vendorStylesheet(css, { label, textSubsetsOnly, iconCount }) {
  const kept = [];
  for (const match of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const declarations = match[1];
    const subset = detectSubset(declarations);
    if (textSubsetsOnly && !KEEP_SUBSETS.has(subset)) continue;

    const remote = (declarations.match(/url\((https:\/\/[^)]+)\)/) ?? [])[1];
    if (!remote) continue;

    const weight = (declarations.match(/font-weight:\s*([^;]+);/) ?? [])[1]?.trim() ?? "400";
    const style = (declarations.match(/font-style:\s*([^;]+);/) ?? [])[1]?.trim() ?? "normal";
    const fileName = `${label}-${weight.replace(/\s+/g, "_")}-${style}-${subset}.woff2`;

    const bytes = await getBinary(remote);
    await writeFile(path.join(OUT_DIR, fileName), bytes);

    const rules = declarations
      .replace(/url\(https:\/\/[^)]+\)/, `url("/fonts/${fileName}")`)
      .replace(/\s+/g, " ")
      .trim()
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => `  ${declaration};`)
      .join("\n");

    kept.push({ fileName, bytes: bytes.length, rules });
  }
  if (kept.length === 0) {
    throw new Error(
      `no @font-face rules survived for ${label}${iconCount === undefined ? "" : ` (${iconCount} icon names)`}`,
    );
  }
  return kept;
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(CSS_OUT), { recursive: true });

  const rules = [];
  const inventory = [];

  for (const family of TEXT_FAMILIES) {
    const css = await getText(
      `https://fonts.googleapis.com/css2?family=${family.query}&display=swap`,
    );
    const kept = await vendorStylesheet(css, { label: family.label, textSubsetsOnly: true });
    for (const face of kept) {
      rules.push(`/* ${family.label} */\n@font-face {\n${face.rules}\n}`);
      inventory.push({ label: family.label, fileName: face.fileName, bytes: face.bytes });
    }
  }

  const iconNames = await compositionIconNames();
  const iconCss = await getText(
    `https://fonts.googleapis.com/css2?family=${ICON_QUERY}&icon_names=${iconNames.join(",")}`,
  );
  for (const face of await vendorStylesheet(iconCss, {
    label: "material-symbols-outlined",
    textSubsetsOnly: false,
    iconCount: iconNames.length,
  })) {
    rules.push(
      `/* Material Symbols Outlined — the ${iconNames.length} ligatures the library uses */\n@font-face {\n${face.rules}\n}`,
    );
    inventory.push({ label: "material-symbols", fileName: face.fileName, bytes: face.bytes });
  }

  // Google's own class definition ships inside the icon stylesheet; keep it
  // verbatim (stitch-scopes.css layers the compositions' own
  // font-variation-settings on top, exactly as the compositions' <style> does).
  const classIndex = iconCss.indexOf(".material-symbols-outlined");
  if (classIndex === -1) throw new Error("the icon stylesheet no longer carries its class definition");
  const iconClass = iconCss.slice(classIndex).trim();

  const header = [
    "/*",
    " * GENERATED by scripts/vendor-fonts.mjs — do not edit by hand.",
    " *",
    " * The literal typefaces of the Stitch compositions (Phase 14 D-04), served from",
    " * this origin so no page load reaches a third party and the PWA renders them",
    " * offline. Text families ship the latin slice only (the content is English, and",
    ` * that slice carries the em dash and curly quotes); the icon face carries exactly`,
    ` * the ${iconNames.length} ligatures the 45 compositions reference, and no others.`,
    " */",
    "",
  ].join("\n");

  await writeFile(CSS_OUT, `${header}${rules.join("\n\n")}\n\n${iconClass}\n`);

  const total = inventory.reduce((sum, face) => sum + face.bytes, 0);
  console.log(`vendored ${inventory.length} faces, ${(total / 1024).toFixed(1)} KiB total`);
  for (const face of inventory) {
    console.log(`  ${face.fileName}  ${(face.bytes / 1024).toFixed(1)} KiB`);
  }
  console.log(`icon names: ${iconNames.length}`);
}

await main();
