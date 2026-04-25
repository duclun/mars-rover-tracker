#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromArrayBuffer } from 'geotiff';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'data', 'dem');

/**
 * Pack a Float32Array of elevations (meters) into a 16-bit heightfield.
 * Normalized so min -> 0, max -> 65535. Metadata records min/max so
 * consumers can reconstruct meters.
 *
 * @param {Float32Array} elevations  row-major, height*width entries
 * @param {number} width
 * @param {number} height
 * @returns {{ width: number, height: number, minElev: number, maxElev: number, bin: Uint8Array }}
 */
export function dataToHeightfield(elevations, width, height) {
  if (elevations.length !== width * height) {
    throw new Error(
      `elevations length ${elevations.length} does not match ${width}x${height} = ${width * height}`,
    );
  }
  let minElev = Infinity;
  let maxElev = -Infinity;
  for (let i = 0; i < elevations.length; i++) {
    const e = elevations[i];
    if (e < minElev) minElev = e;
    if (e > maxElev) maxElev = e;
  }

  const range = maxElev - minElev;
  const bin = new Uint8Array(width * height * 2);
  const view = new DataView(bin.buffer);
  for (let i = 0; i < elevations.length; i++) {
    const norm = range === 0 ? 0 : (elevations[i] - minElev) / range;
    view.setUint16(i * 2, Math.round(norm * 65535), true);
  }

  return { width, height, minElev, maxElev, bin };
}

/**
 * CLI entry: bake-dem.mjs <input.tif> <output-name>
 * Reads a GeoTIFF, extracts elevation, writes <output-name>.bin and .json.
 */
async function main() {
  const [, , inputPath, outName] = process.argv;
  if (!inputPath || !outName) {
    console.error('usage: bake-dem.mjs <input.tif> <output-name>');
    process.exit(1);
  }

  console.log(`reading ${inputPath} ...`);
  const buf = await readFile(inputPath);
  const tiff = await fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY] in source CRS

  console.log(`  size: ${width}x${height}`);
  console.log(`  bbox: ${bbox.map(n => n.toFixed(4)).join(', ')}`);

  const rasters = await image.readRasters();
  const elevations = rasters[0];

  const f32 = elevations instanceof Float32Array ? elevations : Float32Array.from(elevations);
  const hf = dataToHeightfield(f32, width, height);

  await mkdir(OUT_DIR, { recursive: true });
  const binPath = join(OUT_DIR, `${outName}.bin`);
  const metaPath = join(OUT_DIR, `${outName}.json`);

  await writeFile(binPath, hf.bin);
  await writeFile(metaPath, JSON.stringify({
    source: basename(inputPath),
    width: hf.width,
    height: hf.height,
    minElev: hf.minElev,
    maxElev: hf.maxElev,
    bbox: { minLon: bbox[0], minLat: bbox[1], maxLon: bbox[2], maxLat: bbox[3] },
    bakedAt: new Date().toISOString(),
  }, null, 2) + '\n');

  console.log(`wrote ${binPath} (${hf.bin.byteLength} bytes)`);
  console.log(`wrote ${metaPath}`);
  console.log(`elev range: ${hf.minElev.toFixed(2)} m -> ${hf.maxElev.toFixed(2)} m`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
