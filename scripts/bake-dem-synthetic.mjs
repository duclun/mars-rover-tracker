#!/usr/bin/env node
/**
 * Generates a synthetic 256x256 sinusoidal heightfield approximating
 * Jezero Crater terrain (-2600 m to -2400 m range, similar to MOLA data).
 * Used in place of a real HiRISE GeoTIFF when the source tile is unavailable.
 * The pipeline is identical -- only the data source differs.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataToHeightfield } from './bake-dem.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'data', 'dem');

const WIDTH = 256;
const HEIGHT = 256;

// Jezero Crater bounding box (approximate, from MOLA)
const MIN_LON = 77.1;
const MAX_LON = 77.7;
const MIN_LAT = 18.1;
const MAX_LAT = 18.7;

// Generate synthetic terrain: crater bowl + rim + random roughness
const elevations = new Float32Array(WIDTH * HEIGHT);
const cx = WIDTH / 2;
const cy = HEIGHT / 2;

for (let row = 0; row < HEIGHT; row++) {
  for (let col = 0; col < WIDTH; col++) {
    // Normalized radial distance from center [0, 1]
    const dx = (col - cx) / cx;
    const dy = (row - cy) / cy;
    const r = Math.sqrt(dx * dx + dy * dy);

    // Crater bowl shape: floor at -2600 m, rim at -2450 m
    const bowl = -2600 + 150 * Math.min(r, 1) * Math.min(r, 1);
    // Sinusoidal roughness ±15 m
    const roughness = 15 * Math.sin(col * 0.4) * Math.cos(row * 0.3);

    elevations[row * WIDTH + col] = bowl + roughness;
  }
}

await mkdir(OUT_DIR, { recursive: true });

const hf = dataToHeightfield(elevations, WIDTH, HEIGHT);

await writeFile(join(OUT_DIR, 'perseverance.bin'), hf.bin);
await writeFile(join(OUT_DIR, 'perseverance.json'), JSON.stringify({
  source: 'synthetic-sinusoidal (M0 spike placeholder)',
  note: 'Replace with real HiRISE DTM tile DTEEC_036081_1985_036147_1985_A01 for M3',
  width: hf.width,
  height: hf.height,
  minElev: hf.minElev,
  maxElev: hf.maxElev,
  bbox: { minLon: MIN_LON, minLat: MIN_LAT, maxLon: MAX_LON, maxLat: MAX_LAT },
  bakedAt: new Date().toISOString(),
}, null, 2) + '\n');

console.log(`synthetic DEM: ${WIDTH}x${HEIGHT}, ${hf.bin.byteLength} bytes`);
console.log(`elev range: ${hf.minElev.toFixed(2)} m -> ${hf.maxElev.toFixed(2)} m`);
console.log('wrote data/dem/perseverance.bin + .json');
