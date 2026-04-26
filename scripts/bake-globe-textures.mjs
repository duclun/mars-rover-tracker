#!/usr/bin/env node
import { writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data', 'textures');
const BASIS_OUT = join(ROOT, 'public', 'basis');
const CACHE_DIR = join(ROOT, '.cache');

await mkdir(OUT_DIR, { recursive: true });
await mkdir(BASIS_OUT, { recursive: true });
await mkdir(CACHE_DIR, { recursive: true });

// ---- 1. Albedo: Solar System Scope 2K Mars (CC BY 4.0) ----
const albedoPath = join(OUT_DIR, 'mars-albedo.jpg');
process.stdout.write('Downloading mars-albedo.jpg ... ');
const albedoRes = await fetch('https://www.solarsystemscope.com/textures/download/2k_mars.jpg', {
  headers: { 'User-Agent': 'mars-rover-tracker texture-fetcher (educational)' },
});
if (!albedoRes.ok) throw new Error(`Albedo fetch failed: HTTP ${albedoRes.status}`);
const albedoBytes = new Uint8Array(await albedoRes.arrayBuffer());
await writeFile(albedoPath, albedoBytes);
console.log(`OK (${(albedoBytes.byteLength / 1024).toFixed(0)} KB)`);

// ---- 2. Elevation: procedural 512x256 grayscale PNG ----
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
    const dLat = lat - 0.31, dLon = lon - 3.93;
    const olympus = 0.18 * Math.exp(-(dLat * dLat + dLon * dLon) * 60);
    const hLat = lat + 0.73, hLon = lon - 1.22;
    const hellas = -0.12 * Math.exp(-(hLat * hLat + hLon * hLon) * 80);
    const tLon = lon - 4.54;
    const tharsis = 0.1 * Math.exp(-(lat * lat * 10 + tLon * tLon * 3));
    const noise = 0.04 * (Math.sin(lat * 12) * Math.cos(lon * 8) + Math.cos(lat * 7) * Math.sin(lon * 5));
    pixels[row * W + col] = Math.round(Math.min(1, Math.max(0, base + olympus + hellas + tharsis + noise)) * 255);
  }
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
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
  const len = new DataView(new ArrayBuffer(4)); len.setUint32(0, data.length);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = new DataView(new ArrayBuffer(4)); crcBuf.setUint32(0, crc >>> 0);
  return Buffer.concat([new Uint8Array(len.buffer), typeBuf, data, new Uint8Array(crcBuf.buffer)]);
}
function writePNG(width, height, gray) {
  const IHDR = makePNGChunk('IHDR', (() => {
    const b = new DataView(new ArrayBuffer(13));
    b.setUint32(0, width); b.setUint32(4, height);
    b.setUint8(8, 8); b.setUint8(9, 0); b.setUint8(10, 0); b.setUint8(11, 0); b.setUint8(12, 0);
    return new Uint8Array(b.buffer);
  })());
  const raw = new Uint8Array(height * (width + 1));
  for (let r = 0; r < height; r++) {
    raw[r * (width + 1)] = 0;
    raw.set(gray.subarray(r * width, (r + 1) * width), r * (width + 1) + 1);
  }
  const IDAT = makePNGChunk('IDAT', deflateSync(raw, { level: 6 }));
  const IEND = makePNGChunk('IEND', new Uint8Array(0));
  return Buffer.concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), IHDR, IDAT, IEND]);
}
await writeFile(join(OUT_DIR, 'mars-elev.png'), writePNG(W, H, pixels));
console.log('OK');

// ---- 3. Download basisu.exe (Windows) ----
const basisuExe = join(CACHE_DIR, 'basisu.exe');
async function fileExists(p) { try { await access(p); return true; } catch { return false; } }

if (!await fileExists(basisuExe)) {
  process.stdout.write('Downloading basisu.exe ... ');
  const ZIP_URL = 'https://github.com/BinomialLLC/basis_universal/releases/download/1.16.3/basisu_1_16_3.zip';
  const zipRes = await fetch(ZIP_URL, { headers: { 'User-Agent': 'mars-rover-tracker' } });
  if (!zipRes.ok) throw new Error(`basisu download failed: HTTP ${zipRes.status}`);
  const zipPath = join(CACHE_DIR, 'basisu_1_16_3.zip');
  await writeFile(zipPath, new Uint8Array(await zipRes.arrayBuffer()));
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${CACHE_DIR}' -Force"`, { stdio: 'pipe' });
  const findResult = execSync(`powershell -Command "Get-ChildItem -Path '${CACHE_DIR}' -Filter 'basisu.exe' -Recurse | Select-Object -First 1 -ExpandProperty FullName"`, { encoding: 'utf8' }).trim();
  if (findResult && findResult !== basisuExe) {
    await copyFile(findResult, basisuExe);
  }
  console.log('OK');
}

// ---- 4. Convert JPEG → KTX2 ----
const ktx2Path = join(OUT_DIR, 'mars-albedo.ktx2');
process.stdout.write('Converting mars-albedo.jpg → mars-albedo.ktx2 ... ');
execSync(`"${basisuExe}" -ktx2 "${albedoPath}" -output_file "${ktx2Path}" -mipmap`, { stdio: 'pipe' });
const ktx2Size = statSync(ktx2Path).size;
console.log(`OK (${(ktx2Size / 1024).toFixed(0)} KB)`);

// ---- 5. Copy transcoder files from three.js ----
process.stdout.write('Copying basis transcoder from three.js ... ');
const threeBase = join(ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'basis');
await copyFile(join(threeBase, 'basis_transcoder.js'), join(BASIS_OUT, 'basis_transcoder.js'));
await copyFile(join(threeBase, 'basis_transcoder.wasm'), join(BASIS_OUT, 'basis_transcoder.wasm'));
console.log('OK');

console.log('\nTextures written to public/data/textures/');
console.log('Transcoder written to public/basis/');
console.log('Attribution: Solar System Scope CC BY 4.0 (mars-albedo.jpg)');
