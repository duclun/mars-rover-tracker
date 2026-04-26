#!/usr/bin/env node
/**
 * Fetches 256x256 MOLA MEGDR 128ppd crops centered on each rover via HTTP Range
 * requests (~6 MB per rover instead of the full 129 MB tile).
 *
 * Output: data/dem/{roverId}.bin + data/dem/{roverId}.json
 *
 * Source: MOLA MEGDR L3 v1.0, 128ppd, 16-bit big-endian signed integer, meters vs areoid
 * https://pds-geosciences.wustl.edu/missions/mgs/megdr.html
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { dataToHeightfield } from './bake-dem.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'data', 'dem');

const PPD = 128;
const TILE_COLS = 11520; // 90° × 128ppd
const TILE_ROWS = 5632;  // 44° × 128ppd
const CROP_SIZE = 256;

// Each MOLA tile covers a 44°-lat × 90°-lon quadrant.
// File naming: megt<latEdge><N|S><lonEdge>hb.img
//   latEdge = latitude of the top edge (44 for N tiles, 00 for S)
//   N/S     = hemisphere direction from latEdge
//   lonEdge = longitude of left edge (000, 090, 180, 270)
const ROVERS = {
  perseverance: {
    lat: 18.4325, lon: 77.2201,
    // tile covers 44°N→0°, 0°E→90°E
    tileUrl: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/megt44n000hb.img',
    tileLatTop: 44, tileLonLeft: 0,
    latDirection: 1,  // row 0 = top latitude, rows go south (+)
  },
  curiosity: {
    lat: -4.8143, lon: 137.3817,
    // tile covers 0°→44°S, 90°E→180°E
    tileUrl: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/megt44s090hb.img',
    tileLatTop: 0, tileLonLeft: 90,
    latDirection: -1, // row 0 = equator, rows go south (lat decreases)
  },
};

function rangeRequest(url, startByte, endByte) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Range: `bytes=${startByte}-${endByte}` } }, (res) => {
      if (res.statusCode !== 206 && res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchCrop(roverId, { lat, lon, tileUrl, tileLatTop, tileLonLeft, latDirection }) {
  console.log(`\n${roverId} (lat ${lat}, lon ${lon})`);

  // Row 0 = tileLatTop, row increases going south
  const centerRow = Math.round(Math.abs(tileLatTop - lat) * PPD);
  const centerCol = Math.round((lon - tileLonLeft) * PPD);

  const rowStart = Math.max(0, Math.min(TILE_ROWS - CROP_SIZE, centerRow - CROP_SIZE / 2));
  const colStart = Math.max(0, Math.min(TILE_COLS - CROP_SIZE, centerCol - CROP_SIZE / 2));

  // Reconstruct actual bbox from pixel positions
  const bboxMinLat = tileLatTop - (rowStart + CROP_SIZE) / PPD * latDirection * -1;
  const bboxMaxLat = tileLatTop - rowStart / PPD * latDirection * -1;

  // Simpler bbox calc:
  const topLat    = tileLatTop - rowStart / PPD;      // for N tiles: positive, for S tiles: near 0
  const bottomLat = tileLatTop - (rowStart + CROP_SIZE) / PPD;
  const leftLon   = tileLonLeft + colStart / PPD;
  const rightLon  = tileLonLeft + (colStart + CROP_SIZE) / PPD;

  // For S tiles tileLatTop=0, so bottomLat goes negative — that's correct
  const minLat = Math.min(topLat, bottomLat);
  const maxLat = Math.max(topLat, bottomLat);

  console.log(`  pixel rows ${rowStart}–${rowStart + CROP_SIZE - 1}, cols ${colStart}–${colStart + CROP_SIZE - 1}`);
  console.log(`  bbox lon ${leftLon.toFixed(3)}–${rightLon.toFixed(3)}°E, lat ${minLat.toFixed(3)}–${maxLat.toFixed(3)}°`);

  const bytesPerRow = TILE_COLS * 2;
  const startByte = rowStart * bytesPerRow;
  const endByte   = (rowStart + CROP_SIZE) * bytesPerRow - 1;
  console.log(`  fetching ${((endByte - startByte + 1) / 1024 / 1024).toFixed(1)} MB...`);

  const buf = await rangeRequest(tileUrl, startByte, endByte);
  console.log(`  received ${buf.byteLength} bytes`);

  // Extract column slice from each row, convert big-endian int16 → float32
  const elevations = new Float32Array(CROP_SIZE * CROP_SIZE);
  for (let r = 0; r < CROP_SIZE; r++) {
    for (let c = 0; c < CROP_SIZE; c++) {
      const byteOff = r * bytesPerRow + (colStart + c) * 2;
      elevations[r * CROP_SIZE + c] = buf.readInt16BE(byteOff);
    }
  }

  const hf = dataToHeightfield(elevations, CROP_SIZE, CROP_SIZE);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, `${roverId}.bin`), hf.bin);
  await writeFile(join(OUT_DIR, `${roverId}.json`), JSON.stringify({
    source: `MOLA MEGDR 128ppd (${tileUrl.split('/').pop()})`,
    width: CROP_SIZE,
    height: CROP_SIZE,
    minElev: hf.minElev,
    maxElev: hf.maxElev,
    bbox: { minLon: leftLon, minLat, maxLon: rightLon, maxLat },
    bakedAt: new Date().toISOString(),
  }, null, 2) + '\n');

  console.log(`  wrote ${roverId}.bin (${hf.bin.byteLength} bytes)`);
  console.log(`  elev range: ${hf.minElev.toFixed(0)} m → ${hf.maxElev.toFixed(0)} m`);
}

async function main() {
  for (const [id, opts] of Object.entries(ROVERS)) {
    await fetchCrop(id, opts);
  }
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
