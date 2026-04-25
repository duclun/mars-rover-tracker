import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WaypointFeatureCollectionSchema,
  TraverseFeatureCollectionSchema,
} from './schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, '..', '..', 'data', 'fixtures');

function load(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

describe('real MMGIS fixtures parse against the schema', () => {
  it('M20_waypoints.json parses', () => {
    const result = WaypointFeatureCollectionSchema.safeParse(load('M20_waypoints.json'));
    if (!result.success) console.error(JSON.stringify(result.error.format(), null, 2));
    expect(result.success).toBe(true);
  });

  it('MSL_waypoints.json parses', () => {
    const result = WaypointFeatureCollectionSchema.safeParse(load('MSL_waypoints.json'));
    if (!result.success) console.error(JSON.stringify(result.error.format(), null, 2));
    expect(result.success).toBe(true);
  });

  it('M20_traverse.json parses', () => {
    const result = TraverseFeatureCollectionSchema.safeParse(load('M20_traverse.json'));
    if (!result.success) console.error(JSON.stringify(result.error.format(), null, 2));
    expect(result.success).toBe(true);
  });

  it('MSL_traverse.json parses', () => {
    const result = TraverseFeatureCollectionSchema.safeParse(load('MSL_traverse.json'));
    if (!result.success) console.error(JSON.stringify(result.error.format(), null, 2));
    expect(result.success).toBe(true);
  });
});
