import { describe, it, expect } from 'vitest';
import {
  WaypointFeatureSchema,
  WaypointFeatureCollectionSchema,
  TraverseFeatureCollectionSchema,
} from './schema';

describe('WaypointFeatureSchema', () => {
  it('parses a minimal waypoint feature', () => {
    const input = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [77.45, 18.44] },
      properties: {
        sol: 100,
        site: 12,
        pos: 3,
        lon: 77.45,
        lat: 18.44,
        elev_geoid: -2540.5,
        drive: 1,
        dist_m: 12.3,
        dist_total: 1500.4,
      },
    };
    const result = WaypointFeatureSchema.parse(input);
    expect(result.properties.sol).toBe(100);
    expect(result.properties.notes).toBeUndefined();
  });

  it('parses a waypoint feature with notes', () => {
    const input = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [77.45, 18.44] },
      properties: {
        sol: 100, site: 12, pos: 3, lon: 77.45, lat: 18.44,
        elev_geoid: -2540.5, drive: 1, dist_m: 12.3, dist_total: 1500.4,
        notes: 'Drilled rock target Foux',
      },
    };
    const result = WaypointFeatureSchema.parse(input);
    expect(result.properties.notes).toBe('Drilled rock target Foux');
  });

  it('rejects a feature with missing required fields', () => {
    const input = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [77.45, 18.44] },
      properties: { sol: 100 },
    };
    expect(() => WaypointFeatureSchema.parse(input)).toThrow();
  });
});

describe('WaypointFeatureCollectionSchema', () => {
  it('parses an empty FeatureCollection', () => {
    const input = { type: 'FeatureCollection', features: [] };
    const result = WaypointFeatureCollectionSchema.parse(input);
    expect(result.features).toHaveLength(0);
  });
});

describe('TraverseFeatureCollectionSchema', () => {
  it('parses a LineString traverse feature', () => {
    const input = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[77.45, 18.44], [77.46, 18.45]] },
        properties: { sol_start: 1, sol_end: 50 },
      }],
    };
    const result = TraverseFeatureCollectionSchema.parse(input);
    expect(result.features[0].geometry.type).toBe('LineString');
  });
});
