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

stripe(140, 500, 760, 140, 42, AQUA);
stripe(200, 610, 980, 320, 42, GRAPE); // different slope — must not be parallel

// interchange ring at the visual crossing of the two stripes
function intersect(a1, b1, a2, b2) {
  const d1x = b1[0] - a1[0], d1y = b1[1] - a1[1];
  const d2x = b2[0] - a2[0], d2y = b2[1] - a2[1];
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-6) return null; // parallel — skip the ring
  const t = ((a2[0] - a1[0]) * d2y - (a2[1] - a1[1]) * d2x) / denom;
  return [a1[0] + t * d1x, a1[1] + t * d1y];
}
const ix = intersect([140, 500], [760, 140], [200, 610], [980, 320]);
if (ix && Number.isFinite(ix[0]) && Number.isFinite(ix[1])) {
  const [cx, cy] = ix;
  for (let y = Math.floor(cy - 70); y <= Math.ceil(cy + 70); y++) {
    for (let x = Math.floor(cx - 70); x <= Math.ceil(cx + 70); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 66 && d >= 44) set(x, y, ...WHITE);
      else if (d <= 16) set(x, y, ...WHITE);
    }
  }
}

// corner brand bars
for (let x = 72; x < 232; x++) for (let y = 72; y < 82; y++) set(x, y, ...AQUA);
for (let x = 72; x < 232; x++) for (let y = 88; y < 98; y++) set(x, y, ...GRAPE);

// wordmark blocks: M E T R O M I N D as simple bars (abstract, geometric)
const bar = (x, y, w, h, col) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, ...col); };
// H O M E-ish composition bottom-left: three ascending blocks
bar(72, 520, 56, 38, WHITE);
bar(140, 496, 56, 62, WHITE);
bar(208, 472, 56, 86, AQUA);

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
