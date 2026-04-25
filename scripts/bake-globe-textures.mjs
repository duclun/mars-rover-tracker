#!/usr/bin/env node
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'data', 'textures');

await mkdir(OUT_DIR, { recursive: true });

// --- 1. Albedo: Solar System Scope 2K Mars (CC BY 4.0) ---
const ALBEDO_URL = 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg';
process.stdout.write('Downloading mars-albedo.jpg ... ');
const albedoRes = await fetch(ALBEDO_URL, {
  headers: { 'User-Agent': 'mars-rover-tracker texture-fetcher (educational)' },
});
if (!albedoRes.ok) throw new Error(`Albedo fetch failed: HTTP ${albedoRes.status}`);
const albedoBytes = new Uint8Array(await albedoRes.arrayBuffer());
await writeFile(join(OUT_DIR, 'mars-albedo.jpg'), albedoBytes);
console.log(`OK (${(albedoBytes.byteLength / 1024).toFixed(0)} KB)`);

// --- 2. Elevation: procedural 512x256 grayscale PNG ---
process.stdout.write('Generating mars-elev.png (procedural) ... ');
const W = 512, H = 256;
const pixels = new Uint8Array(W * H);
for (let row = 0; row < H; row++) {
  const latFrac = row / H;
  const lat = (latFrac - 0.5) * Math.PI;
  for (let col = 0; col < W; col++) {
    const lonFrac = col / W;
    const lon = lonFrac * 2 * Math.PI;
    const base = 0.45 + 0.1 * Math.abs(Math.sin(lat));
    const dLat = lat - 0.31;
    const dLon = lon - 3.93;
    const olympus = 0.18 * Math.exp(-(dLat * dLat + dLon * dLon) * 60);
    const hLat = lat + 0.73;
    const hLon = lon - 1.22;
    const hellas = -0.12 * Math.exp(-(hLat * hLat + hLon * hLon) * 80);
    const tLon = lon - 4.54;
    const tharsis = 0.1 * Math.exp(-(lat * lat * 10 + tLon * tLon * 3));
    const noise = 0.04 * (Math.sin(lat * 12) * Math.cos(lon * 8) + Math.cos(lat * 7) * Math.sin(lon * 5));
    const val = Math.min(1, Math.max(0, base + olympus + hellas + tharsis + noise));
    pixels[row * W + col] = Math.round(val * 255);
  }
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function makePNGChunk(type, data) {
  const typeBuf = new TextEncoder().encode(type);
  const len = new DataView(new ArrayBuffer(4));
  len.setUint32(0, data.length);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = new DataView(new ArrayBuffer(4));
  crcBuf.setUint32(0, crc >>> 0);
  return Buffer.concat([
    new Uint8Array(len.buffer), typeBuf, data, new Uint8Array(crcBuf.buffer),
  ]);
}

function writePNG(width, height, gray) {
  const IHDR = makePNGChunk('IHDR', (() => {
    const b = new DataView(new ArrayBuffer(13));
    b.setUint32(0, width); b.setUint32(4, height);
    b.setUint8(8, 8);
    b.setUint8(9, 0);
    b.setUint8(10, 0); b.setUint8(11, 0); b.setUint8(12, 0);
    return new Uint8Array(b.buffer);
  })());
  const raw = new Uint8Array(height * (width + 1));
  for (let r = 0; r < height; r++) {
    raw[r * (width + 1)] = 0;
    raw.set(gray.subarray(r * width, (r + 1) * width), r * (width + 1) + 1);
  }
  const compressed = deflateSync(raw, { level: 6 });
  const IDAT = makePNGChunk('IDAT', compressed);
  const IEND = makePNGChunk('IEND', new Uint8Array(0));
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, IHDR, IDAT, IEND]);
}

const pngBuf = writePNG(W, H, pixels);
await writeFile(join(OUT_DIR, 'mars-elev.png'), pngBuf);
console.log(`OK (${(pngBuf.byteLength / 1024).toFixed(0)} KB)`);

console.log('\nTextures written to public/data/textures/');
console.log('Attribution: Solar System Scope CC BY 4.0 (mars-albedo.jpg)');
console.log('Note: Replace mars-elev.png with real MOLA data in M2.');
