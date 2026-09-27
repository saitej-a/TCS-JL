/**
 * PWA icon generator (9.4 Task 8).
 *
 * §10.1 asks for 192 + 512 maskable icons "generated from the existing brand
 * mark; no external icon package". The brand mark is the AppShell's `TJT`
 * indigo tile, so this script draws exactly that: a full-bleed #4F46E5 square
 * (maskable icons are cropped to a circle, so the mark is kept inside the safe
 * 80% zone) with the letters T, J, T in white.
 *
 * Deterministic and dependency-free: a hand-written 5×7 bitmap face, raw
 * pixels, and a minimal PNG encoder built on Node's own `zlib`. Re-running it
 * reproduces byte-identical files, so the committed PNGs stay stable.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "public", "icons");

/** §4's brand-600, the same indigo the app's mark uses. */
const BRAND = [0x4f, 0x46, 0xe5];
const WHITE = [0xff, 0xff, 0xff];

/** 5×7 glyphs for the three letters of the mark. */
const GLYPHS = {
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  J: ["00010", "00010", "00010", "00010", "00010", "10010", "01100"],
};

const MARK = ["T", "J", "T"];

function buildRgb(size) {
  const pixels = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 3] = BRAND[0];
    pixels[i * 3 + 1] = BRAND[1];
    pixels[i * 3 + 2] = BRAND[2];
  }

  const glyphWidth = 5;
  const glyphHeight = 7;
  const gap = 1;
  const unitsWide = MARK.length * glyphWidth + (MARK.length - 1) * gap;
  // 62% of the canvas keeps the mark inside a maskable icon's safe zone.
  const scale = Math.max(1, Math.floor((size * 0.62) / unitsWide));
  const markWidth = unitsWide * scale;
  const markHeight = glyphHeight * scale;
  const originX = Math.floor((size - markWidth) / 2);
  const originY = Math.floor((size - markHeight) / 2);

  MARK.forEach((letter, index) => {
    const rows = GLYPHS[letter];
    const glyphX = originX + index * (glyphWidth + gap) * scale;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        if (row[x] !== "1") continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            const px = glyphX + x * scale + dx;
            const py = originY + y * scale + dy;
            const offset = (py * size + px) * 3;
            pixels[offset] = WHITE[0];
            pixels[offset + 1] = WHITE[1];
            pixels[offset + 2] = WHITE[2];
          }
        }
      }
    });
  });

  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgb) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    rgb.subarray(y * size * 3, (y + 1) * size * 3).forEach((value, index) => {
      raw[y * (size * 3 + 1) + 1 + index] = value;
    });
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const file = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, buildRgb(size)));
  console.log(`wrote ${file}`);
}
