#!/usr/bin/env node
/**
 * Proves "verbatim" mechanically (Phase 14 D-08/G-6).
 *
 * The claim this repo makes from Phase 14 on is that a screen's markup **is** its
 * Stitch composition. Claims like that decay silently — two tasks later "verbatim"
 * means "inspired by" and nobody can tell. This script is the difference: it reads
 * the composition and the ported source and fails, by name, when the two no longer
 * agree.
 *
 * Comments are stripped before anything is read: the ported sources *document* the
 * mockup's fiction ("this pill claimed `Live Sync Active`"), and documentation is
 * not markup.
 *
 * What it checks, per composition:
 *   1. **Classes.** Every class token in the composition's screen region appears in
 *      the ported source's string literals — unless the composition's row in
 *      RECONCILIATION-14.md declares it "not carried" (a deliberate drop, with its
 *      own column and reason). Nothing may vanish quietly.
 *   2. **Glyphs.** Every `data-icon` name and every `material-symbols-outlined`
 *      span body in the region appears in the source (as the attribute value and
 *      as the ligature text).
 *   3. **Structure.** Every heading text the region declares appears in the source
 *      — the composition's section order, in the composition's words.
 *   4. **Awaiting slots (D-02).** Every `data-awaiting="…"` in the source is listed
 *      in the row's Awaiting column, and every listed slot exists in the source
 *      (bidirectional: no undeclared gaps, no stale declarations).
 *   5. **Fiction (G-3).** None of the row's Fabrication strings appears in the
 *      source.
 *
 * Usage:
 *   node scripts/stitch-fidelity.mjs --screen tcs_joining_tracker_notification_center \
 *        --source src/pages/NotificationsPage.tsx --source src/components/NotificationRow.tsx
 *   node scripts/stitch-fidelity.mjs --all                     # every rowed screen
 *   node scripts/stitch-fidelity.mjs --screen <folder> --verbose
 *   node scripts/stitch-fidelity.mjs --all --family settings,timeline
 *
 * Exit 0 prints `FIDELITY-OK`; any failure prints the offending tokens and exits 1.
 */
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(SCRIPT_DIR, "..");
const PROJECT_DIR = path.resolve(FRONTEND_DIR, "..");
const DESIGNS_DIR = path.join(FRONTEND_DIR, "stitch designs");
const REGISTERS = {
  awaiting: "Awaiting slots",
  notCarried: "Not carried",
  fiction: "Fabrication kept out",
  sources: "Ported sources",
};

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
/** Repeatable flags: `--screen a --screen b` selects both. */
const values = (name) =>
  args.reduce((all, arg, index) => (arg === name ? [...all, args[index + 1]] : all), []);

const VERBOSE = flag("--verbose");

function getRecordPath() {
  const custom = value("--record");
  if (custom) return path.resolve(process.cwd(), custom);
  const p16 = path.join(
    PROJECT_DIR,
    ".planning",
    "phases",
    "TCS-JL-16-replace-the-current-screens-with-the-frontend-stitch-designs",
    "RECONCILIATION-16.md",
  );
  if (existsSync(p16)) return p16;
  return path.join(
    PROJECT_DIR,
    ".planning",
    "phases",
    "TCS-JL-14-literal-stitch-markup-in-the-app",
    "RECONCILIATION-14.md",
  );
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** The composition document, minus its scripts and styles (their strings are not markup). */
async function readComposition(folder) {
  const file = path.join(DESIGNS_DIR, folder, "code.html");
  if (!existsSync(file)) fail(`no composition at ${file}`);
  const html = await readFile(file, "utf8");
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "");
}

/**
 * The screen's own region. A composition is a whole document — its chrome belongs
 * to the shell composition (D-01), so `<main>` is the region when it exists.
 */
function screenRegion(html) {
  const match = html.match(/<main[\s\S]*?<\/main>/);
  if (match) return { region: match[0], boundary: "<main>" };
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!body) fail("the composition has no <body>");
  return { region: body[1], boundary: "<body>" };
}

/**
 * A minimal lexer, because the naive "split on quotes" scan desynchronizes the
 * moment a comment says `the document's row`: the apostrophe opens a string that
 * never closes and every `className` after it is swallowed into the gap. So walk
 * the text once — comments dropped, string bodies captured — and read the checks
 * off the result. An apostrophe between two word characters is prose, not a
 * delimiter (the same heuristic every JSX-aware tool uses).
 */
function lex(text) {
  const spans = [];
  let code = "";
  let i = 0;
  const word = /[A-Za-z]/;
  while (i < text.length) {
    const char = text[i];
    if (char === "/" && text[i + 1] === "/") {
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
      continue;
    }
    if (char === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
      code += " ";
      continue;
    }
    if (char === '"' || char === "`") {
      const { body, next } = readString(text, i, char);
      spans.push(body);
      code += char + char;
      i = next;
      continue;
    }
    if (char === "'") {
      const previous = text[i - 1];
      const following = text[i + 1];
      if (word.test(previous ?? "") && word.test(following ?? "")) {
        code += char;
        i += 1;
        continue;
      }
      const { body, next } = readString(text, i, char);
      spans.push(body);
      code += "''";
      i = next;
      continue;
    }
    code += char;
    i += 1;
  }
  return { code, spans };
}

/** The body of the string opening at `start`, and where the scan resumes. */
function readString(text, start, quote) {
  let i = start + 1;
  let body = "";
  while (i < text.length) {
    const char = text[i];
    if (char === "\\") {
      body += text[i + 1] ?? "";
      i += 2;
      continue;
    }
    if (char === quote) return { body, next: i + 1 };
    if (char === "\n" && quote !== "`") return { body, next: i };
    body += char;
    i += 1;
  }
  return { body, next: i };
}

/**
 * Every whitespace-separated token inside any quoted or backticked string. A
 * template literal nests its own quotes (`${active ? "a b" : "c"}`), so tokens
 * also lose any quote characters left clinging to their ends — otherwise the
 * class a conditional picks lands in the set as `"c` and the check reports it
 * missing while the source plainly carries it.
 */
function stringTokens(spans) {
  const tokens = new Set();
  for (const span of spans) {
    for (const raw of span.split(/\s+/)) {
      const token = raw.replace(/^["'`]+|["'`]+$/g, "");
      if (token !== "") tokens.add(token);
    }
  }
  return tokens;
}

/**
 * A value's slot namespace (D-02). Slots are named `<domain>.<field>` so the scan
 * can recognise them wherever they are written — a literal `data-awaiting="…"`
 * or the prop of the element that renders it.
 */
const SLOT_PATTERN =
  /^(?:profile|preferences|pulse|filters|dashboard|timeline|community|privacy|notifications|analytics|onboarding|auth|settings|admin)\.[a-z_]+$/;

function classTokens(region) {
  const tokens = new Set();
  for (const match of region.matchAll(/class="([^"]*)"/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (token !== "" && !token.includes("{{")) tokens.add(token);
    }
  }
  return tokens;
}

function glyphNames(region) {
  const names = new Set();
  for (const match of region.matchAll(/data-icon="([a-z_]+)"/g)) names.add(match[1]);
  for (const match of region.matchAll(/material-symbols-outlined[^>]*>([a-z_]+)</g)) {
    names.add(match[1]);
  }
  return names;
}

function headingTexts(region) {
  const texts = new Set();
  for (const match of region.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)) {
    const text = normalizeText(match[1].replace(/<[^>]+>/g, " "));
    // A heading whose text is entirely markup (the mockup's pill inside an <h1>)
    // still carries its own words; empty results are skipped.
    if (text !== "") texts.add(text);
  }
  return texts;
}

/**
 * Every word of `phrase` appears in `text`, in order and with nothing of the
 * phrase missing — the heading check's comparison.
 */
function wordsInOrder(phrase, text) {
  let cursor = 0;
  for (const word of phrase.split(" ")) {
    if (word === "") continue;
    const at = text.indexOf(word, cursor);
    if (at === -1) return false;
    cursor = at + word.length;
  }
  return true;
}

/**
 * Text comparison for headings. The mockup's headings embed live numbers ("3
 * UNREAD") and the source interpolates them, so digits and JSX expressions are
 * blanked on both sides: the check is about the words the composition uses, in
 * the composition's order, not about the sample data inside them.
 */
function normalizeText(text) {
  return text
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Decode the entities the documents write in text nodes. */
function decode(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** The phase record's rows, keyed by composition folder name. */
async function readRecord() {
  const recordPath = getRecordPath();
  if (!existsSync(recordPath)) {
    fail(
      `no phase record at ${recordPath}\n` +
        "  The fidelity check reads its declared slots, drops and fabrications from there.",
    );
  }
  const markdown = await readFile(recordPath, "utf8");
  const rows = new Map();
  let headers = null;
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) {
      headers = null;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.every((cell) => /^-+$/.test(cell.replace(/:/g, "")) || cell === "")) continue;
    if (headers === null) {
      headers = cells;
      continue;
    }
    const [name] = cells;
    if (name === undefined || name === "") continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    rows.set(name.replace(/`/g, ""), row);
  }
  return rows;
}

/**
 * Backticked, semicolon-separated tokens in a record cell. Semicolons rather than
 * commas because a declared fiction can itself contain a comma ("1,248" was two
 * tokens under a comma rule — and one of them, "1", matched half the source).
 */
function cellTokens(cell) {
  if (cell === undefined) return null;
  const tokens = new Set();
  for (const match of cell.matchAll(/`([^`]+)`/g)) {
    for (const token of match[1].split(/[;\n]/)) {
      const trimmed = token.trim();
      if (trimmed !== "") tokens.add(trimmed);
    }
  }
  return tokens;
}

async function checkScreen(folder, rows, extraSources = []) {
  const row = rows.get(folder);
  if (row === undefined) {
    fail(`MISSING ROW: ${folder} has no row in ${path.basename(getRecordPath())}`);
  }
  for (const [key, header] of Object.entries(REGISTERS)) {
    if (!(header in row)) {
      fail(`MISSING COLUMN: the record has no "${header}" column (needed for ${key}).`);
    }
  }

  const declaredSources = cellTokens(row[REGISTERS.sources]);
  if (declaredSources === null || declaredSources.size === 0) {
    fail(`NO SOURCES: ${folder}'s row declares no ported source.`);
  }
  // `--source` names files the run cares about beyond the record's row (a
  // composition can be fed by a layout the caller wants checked in the same run);
  // it adds to the row, it never replaces it — the record stays the record.
  const sources = [];
  for (const relative of [...declaredSources, ...extraSources]) {
    const file = path.join(FRONTEND_DIR, relative);
    if (!existsSync(file)) fail(`MISSING SOURCE: ${folder} declares ${relative}, which is not on disk.`);
    sources.push({ relative, text: await readFile(file, "utf8") });
  }

  const html = await readComposition(folder);
  const { region, boundary } = screenRegion(html);
  const sourceText = sources.map((source) => source.text).join("\n");
  const { code, spans } = lex(sourceText);
  const sourceTokens = stringTokens(spans);
  const rawText = `${code}\n${spans.join("\n")}`;
  const haystack = normalizeText(rawText);

  const notCarried = cellTokens(row[REGISTERS.notCarried]) ?? new Set();
  const fiction = cellTokens(row[REGISTERS.fiction]) ?? new Set();

  const missingClasses = [];
  const classes = classTokens(region);
  for (const token of classes) {
    if (sourceTokens.has(token) || notCarried.has(token)) continue;
    missingClasses.push(token);
  }

  const missingGlyphs = [];
  for (const glyph of glyphNames(region)) {
    if (sourceTokens.has(glyph)) continue;
    missingGlyphs.push(glyph);
  }

  const missingHeadings = [];
  for (const heading of headingTexts(region)) {
    const decoded = normalizeText(decode(heading));
    if (decoded === "") continue;
    // Words in order, not one contiguous phrase: the ported side is JSX, so a
    // heading's words can sit either side of a `<span>` or a `{count}` while still
    // being the composition's heading word for word.
    if (wordsInOrder(decoded, haystack)) continue;
    missingHeadings.push(decoded);
  }

  const awaitingInSource = new Set();
  for (const span of spans) {
    if (SLOT_PATTERN.test(span)) awaitingInSource.add(span);
  }
  const declaredAwaiting = cellTokens(row[REGISTERS.awaiting]) ?? new Set();
  const undeclared = [...awaitingInSource].filter((slot) => !declaredAwaiting.has(slot));
  const stale = [...declaredAwaiting].filter((slot) => !awaitingInSource.has(slot));

  // Straight substring test on the real text: the fabrication values are what the
  // mockup prints, so they are matched literally, not normalized.
  const fabrications = [];
  for (const value of fiction) {
    if (rawText.includes(value)) fabrications.push(value);
  }

  const problems = [];
  if (missingClasses.length > 0) {
    problems.push(
      `  classes not carried and not declared dropped: ${missingClasses.join(" ")}`,
    );
  }
  if (missingGlyphs.length > 0) problems.push(`  glyphs absent from the source: ${missingGlyphs.join(" ")}`);
  if (missingHeadings.length > 0) {
    problems.push(`  headings absent from the source: ${missingHeadings.map((h) => `"${h}"`).join(", ")}`);
  }
  if (undeclared.length > 0) problems.push(`  awaiting slots not declared in the record: ${undeclared.join(", ")}`);
  if (stale.length > 0) problems.push(`  declared awaiting slots absent from the source: ${stale.join(", ")}`);
  if (fabrications.length > 0) problems.push(`  fabricated values present in the source: ${fabrications.join(", ")}`);

  return {
    folder,
    boundary,
    counts: {
      classes: classes.size,
      glyphs: glyphNames(region).size,
      headings: headingTexts(region).size,
      sourceTokens: sourceTokens.size,
      awaiting: awaitingInSource.size,
      dropped: notCarried.size,
    },
    problems,
  };
}

async function main() {
  const rows = await readRecord();
  const families = value("--family");

  const extraSources = values("--source").filter((source) => source !== undefined);

  let folders;
  const selected = values("--screen").filter((screen) => screen !== undefined);
  if (selected.length > 0) {
    folders = selected;
  } else if (flag("--all")) {
    folders = [];
    for (const entry of await readdir(DESIGNS_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!existsSync(path.join(DESIGNS_DIR, entry.name, "code.html"))) continue;
      folders.push(entry.name);
    }
    folders.sort();
    if (families !== undefined) {
      const wanted = families.split(",").map((family) => family.trim());
      folders = folders.filter((folder) => {
        const row = rows.get(folder);
        const groups = row === undefined ? "" : Object.values(row).join(" ");
        return wanted.some((family) => groups.toLowerCase().includes(family.toLowerCase()));
      });
    }
  } else {
    fail(
      "usage: node scripts/stitch-fidelity.mjs --screen <composition> | --all [--family a,b]\n" +
        "       [--source <file>]… [--verbose]",
    );
  }

  if (folders.length === 0) fail("no compositions selected");

  const results = [];
  for (const folder of folders) {
    results.push(await checkScreen(folder, rows, extraSources));
  }

  const failed = results.filter((result) => result.problems.length > 0);
  if (VERBOSE) {
    for (const result of results) {
      const { counts } = result;
      console.log(
        `${result.folder}  [region ${result.boundary}]  ` +
          `${counts.classes} classes · ${counts.glyphs} glyphs · ${counts.headings} headings · ` +
          `${counts.awaiting} awaiting · ${counts.dropped} declared drops · ` +
          `${counts.sourceTokens} source tokens`,
      );
    }
  }

  if (failed.length > 0) {
    console.error(`FIDELITY-FAIL — ${failed.length}/${results.length} composition(s) no longer match:`);
    for (const result of failed) {
      console.error(`\n${result.folder}`);
      for (const problem of result.problems) console.error(problem);
    }
    process.exit(1);
  }

  console.log(
    `FIDELITY-OK — ${results.length} composition(s) verified against their sources` +
      ` (${results.reduce((sum, result) => sum + result.counts.classes, 0)} class tokens checked)`,
  );
}

await main();
