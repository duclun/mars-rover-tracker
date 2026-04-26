#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pure function. Takes a parsed traverse FeatureCollection (GeoJSON).
 * Returns [[lat, lon], ...] -- one point per drive segment endpoint.
 * GeoJSON coordinate order is [lon, lat, elev]; we swap to [lat, lon].
 */
export function extractTraversePath(traverseGeoJson) {
  const points = [];

  for (const feature of traverseGeoJson.features) {
    const { geometry } = feature;
    let lastCoord;

    if (geometry.type === 'LineString') {
      const c = geometry.coordinates;
      lastCoord = c[c.length - 1];
    } else if (geometry.type === 'MultiLineString') {
      const lines = geometry.coordinates;
      const lastLine = lines[lines.length - 1];
      lastCoord = lastLine[lastLine.length - 1];
    }

    if (!lastCoord) continue;

    const lat = lastCoord[1];
    const lon = lastCoord[0];

    const prev = points[points.length - 1];
    if (!prev || prev[0] !== lat || prev[1] !== lon) {
      points.push([lat, lon]);
    }
  }

  return points;
}

// CLI: reads data/fixtures/, writes public/data/traverses/
const _thisFile = fileURLToPath(import.meta.url).replace(/\\/g, '/');
const _argv1 = (process.argv[1] || '').replace(/\\/g, '/');
if (_argv1 && (_thisFile === _argv1 || _thisFile.endsWith(_argv1) || _argv1.endsWith('bake-traverses.mjs'))) {
  const fixturesDir = join(__dirname, '..', 'data', 'fixtures');
  const outDir = join(__dirname, '..', 'public', 'data', 'traverses');
  mkdirSync(outDir, { recursive: true });

  const rovers = [
    { id: 'perseverance', fixture: 'M20_traverse.json' },
    { id: 'curiosity',    fixture: 'MSL_traverse.json' },
  ];

  for (const { id, fixture } of rovers) {
    process.stdout.write(`Processing ${fixture} ... `);
    const raw = JSON.parse(readFileSync(join(fixturesDir, fixture), 'utf8'));
    const path = extractTraversePath(raw);
    const outPath = join(outDir, `${id}.json`);
    writeFileSync(outPath, JSON.stringify(path) + '\n', 'utf8');
    console.log(`OK -- ${path.length} points -> ${outPath}`);
  }
}
