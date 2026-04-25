#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pure function. Takes raw parsed M20 + MSL WaypointFeatureCollections
 * (plain objects from JSON.parse) and returns a RoversJson object.
 * Used by tests and the CLI below; also re-used by the nightly refresh action (M4).
 */
export function normalizeRovers(m20Waypoints, mslWaypoints) {
  const m20 = m20Waypoints.features[m20Waypoints.features.length - 1].properties;
  const msl = mslWaypoints.features[mslWaypoints.features.length - 1].properties;
  const now = new Date().toISOString();
  return {
    perseverance: {
      id: 'perseverance',
      name: 'Perseverance',
      currentSol: m20.sol,
      lat: m20.lat,
      lon: m20.lon,
      elev_geoid: m20.elev_geoid,
      dist_total_m: m20.dist_total_m,
      RMC: m20.RMC,
      fetchedAt: now,
    },
    curiosity: {
      id: 'curiosity',
      name: 'Curiosity',
      currentSol: msl.sol,
      lat: msl.lat,
      lon: msl.lon,
      elev_geoid: msl.elev_geoid,
      dist_total_m: msl.dist_total_m,
      RMC: msl.RMC,
      fetchedAt: now,
    },
    lastUpdated: now,
  };
}

// CLI: reads from data/fixtures/, writes to public/data/rovers.json
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixturesDir = join(__dirname, '..', 'data', 'fixtures');
  const outDir = join(__dirname, '..', 'public', 'data');

  const m20Raw = JSON.parse(readFileSync(join(fixturesDir, 'M20_waypoints.json'), 'utf8'));
  const mslRaw = JSON.parse(readFileSync(join(fixturesDir, 'MSL_waypoints.json'), 'utf8'));

  const rovers = normalizeRovers(m20Raw, mslRaw);

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'rovers.json');
  writeFileSync(outPath, JSON.stringify(rovers, null, 2) + '\n', 'utf8');
  console.log(`wrote ${outPath}`);
  console.log(`  perseverance: sol ${rovers.perseverance.currentSol}, lat ${rovers.perseverance.lat.toFixed(4)}, lon ${rovers.perseverance.lon.toFixed(4)}`);
  console.log(`  curiosity:    sol ${rovers.curiosity.currentSol}, lat ${rovers.curiosity.lat.toFixed(4)}, lon ${rovers.curiosity.lon.toFixed(4)}`);
}
