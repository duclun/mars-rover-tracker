#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pure function. Takes a parsed waypoint FeatureCollection (GeoJSON Point features).
 * Returns sorted array of { lat, lon, sol, distKm, note }.
 */
export function extractWaypoints(waypointGeoJson) {
  return waypointGeoJson.features
    .map((feature) => {
      const p = feature.properties;
      return {
        lat: p.lat,
        lon: p.lon,
        sol: p.sol,
        distKm: parseFloat((p.dist_total_m / 1000).toFixed(3)),
        note: p.note ?? '',
      };
    })
    .sort((a, b) => a.sol - b.sol);
}

// CLI: reads data/fixtures/, writes public/data/waypoints/
const _thisFile = fileURLToPath(import.meta.url).replace(/\\/g, '/');
const _argv1 = (process.argv[1] || '').replace(/\\/g, '/');
if (_argv1 && (_thisFile === _argv1 || _thisFile.endsWith(_argv1) || _argv1.endsWith('bake-waypoints.mjs'))) {
  const fixturesDir = join(__dirname, '..', 'data', 'fixtures');
  const outDir = join(__dirname, '..', 'public', 'data', 'waypoints');
  mkdirSync(outDir, { recursive: true });

  const rovers = [
    { id: 'perseverance', fixture: 'M20_waypoints.json' },
    { id: 'curiosity',    fixture: 'MSL_waypoints.json' },
  ];

  for (const { id, fixture } of rovers) {
    process.stdout.write(`Processing ${fixture} ... `);
    const raw = JSON.parse(readFileSync(join(fixturesDir, fixture), 'utf8'));
    const waypoints = extractWaypoints(raw);
    const outPath = join(outDir, `${id}.json`);
    writeFileSync(outPath, JSON.stringify(waypoints) + '\n', 'utf8');
    const solRange = waypoints.length > 0
      ? `sol ${waypoints[0].sol}–${waypoints[waypoints.length - 1].sol}`
      : 'empty';
    console.log(`OK -- ${waypoints.length} waypoints (${solRange}) -> ${outPath}`);
  }
}
