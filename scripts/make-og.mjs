// Generates public/og.png (1200×630) with zero dependencies — plain Node zlib.
// Run: node scripts/make-og.mjs
import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const W = 1200;
const H = 630;
const px = new Uint8Array(W * H * 3);

function set(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}

const BG = [0x0a, 0x0d, 0x11];
const DOT = [0x1c, 0x24, 0x2e];
const AQUA = [0x29, 0xc8, 0xcf];
const GRAPE = [0xa1, 0x83, 0xff];
const WHITE = [0xee, 0xf3, 0xf7];

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, ...BG);

// dotted grid
for (let y = 22; y < H; y += 44) {
  for (let x = 22; x < W; x += 44) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) set(x + dx, y + dy, ...DOT);
  }
}

// distance to segment
function distSeg(px0, py0, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px0 - ax) * abx + (py0 - ay) * aby) / (abx * abx + aby * aby)));
  const cx = ax + t * abx, cy = ay + t * aby;
  return Math.hypot(px0 - cx, py0 - cy);
}

function stripe(ax, ay, bx, by, w, col) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (distSeg(x, y, ax, ay, bx, by) <= w / 2) set(x, y, ...col);
    }
  }
}

// ── Team UrbanSync network mark (right side) ───────────────────────────
// octagon of stations around the interchange hub, R = 170
const CX = 880;
const CY = 315;
const R = 170;
const OFF = Math.round(R * Math.SQRT1_2);
const NET = [
  [CX, CY - R], // N
  [CX + OFF, CY - OFF], // NE
  [CX + R, CY], // E
  [CX + OFF, CY + OFF], // SE
  [CX, CY + R], // S
  [CX - OFF, CY + OFF], // SW
  [CX - R, CY], // W
  [CX - OFF, CY - OFF], // NW
];

function disc(cx, cy, r, col) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (Math.hypot(x - cx, y - cy) <= r) set(x, y, ...col);
    }
  }
}

function ringPx(cx, cy, r, w, col) {
  for (let y = Math.floor(cy - r - w); y <= Math.ceil(cy + r + w); y++) {
    for (let x = Math.floor(cx - r - w); x <= Math.ceil(cx + r + w); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r + w / 2 && d >= r - w / 2) set(x, y, ...col);
    }
  }
}

const DIM = [0x1a, 0x6b, 0x70]; // aqua at rest
for (let i = 0; i < 8; i++) {
  const [x2, y2] = NET[i];
  stripe(CX, CY, x2, y2, 10, DIM); // spokes
  const [xj, yj] = NET[(i + 1) % 8];
  stripe(x2, y2, xj, yj, 10, DIM); // ring
}
for (const [a, b] of [[0, 3], [0, 5], [4, 1], [4, 7]]) {
  const [x1, y1] = NET[a];
  const [x2, y2] = NET[b];
  stripe(x1, y1, x2, y2, 6, [0x14, 0x4a, 0x4e]); // long diagonals, dimmer
}
for (const [x, y] of NET) {
  disc(x, y, 22, BG);
  ringPx(x, y, 22, 8, AQUA);
  disc(x, y, 7, WHITE);
}
disc(CX, CY, 52, BG);
ringPx(CX, CY, 50, 11, WHITE);
ringPx(CX, CY, 31, 8, AQUA);
disc(CX, CY, 13, WHITE);

// corner brand bars
for (let x = 72; x < 262; x++) for (let y = 72; y < 84; y++) set(x, y, ...AQUA);
for (let x = 72; x < 262; x++) for (let y = 96; y < 108; y++) set(x, y, ...GRAPE);

// wordmark blocks: abstract ascending bars, bottom-left
const bar = (x, y, w, h, col) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, ...col); };
bar(84, 492, 78, 66, WHITE);
bar(180, 452, 78, 106, WHITE);
bar(276, 412, 78, 146, AQUA);
// dotted ascent — three dots rising toward the mark
for (const [dx, dy, r] of [[420, 430, 8], [492, 372, 10], [576, 314, 13]]) {
  for (let y = dy - r; y <= dy + r; y++) for (let x = dx - r; x <= dx + r; x++) {
    if (Math.hypot(x - dx, y - dy) <= r) set(x, y, ...AQUA);
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0; // filter none
  Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "og.png");
writeFileSync(out, png);
console.log("wrote", out, png.length, "bytes");
