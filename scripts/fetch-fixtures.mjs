#!/usr/bin/env node
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'data', 'fixtures');

const ENDPOINTS = {
  M20_waypoints: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints_current.json',
  M20_traverse:  'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json',
  MSL_waypoints: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints_current.json',
  MSL_traverse:  'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json',
};

async function fetchAndSave(name, url) {
  process.stdout.write(`Fetching ${name} ... `);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'mars-rover-tracker fixture-fetcher (educational)' },
  });
  if (!res.ok) {
    throw new Error(`${name}: HTTP ${res.status} from ${url}`);
  }
  const data = await res.json();
  const out = join(FIXTURES_DIR, `${name}.json`);
  await writeFile(out, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const features = data?.features?.length ?? '?';
  console.log(`OK (${features} features) -> ${out}`);
}

await mkdir(FIXTURES_DIR, { recursive: true });

let failures = 0;
for (const [name, url] of Object.entries(ENDPOINTS)) {
  try {
    await fetchAndSave(name, url);
  } catch (err) {
    console.error(`FAILED ${name}: ${err.message}`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\n${failures} endpoint(s) failed. M0 cannot proceed without fixtures.`);
  console.error('If JPL has changed URLs, update ENDPOINTS in this script and the spec.');
  process.exit(1);
}

console.log('\nAll fixtures saved.');
