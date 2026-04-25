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
      geometry: { type: 'Point', coordinates: [77.45, 18.44, -2540.5] },
      properties: {
        RMC: '87_5154',
        sol: 100,
        site: 12,
        drive: 1,
        lon: 77.45,
        lat: 18.44,
        elev_geoid: -2540.5,
        dist_m: 12.3,
        dist_total_m: 1500.4,
      },
    };
    const result = WaypointFeatureSchema.parse(input);
    expect(result.properties.sol).toBe(100);
    expect(result.properties.RMC).toBe('87_5154');
    expect(result.properties.Note).toBeUndefined();
  });

  it('parses a waypoint feature with Note', () => {
    const input = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [77.45, 18.44] },
      properties: {
        RMC: '87_5154',
        sol: 100, site: 12, drive: 1,
        lon: 77.45, lat: 18.44,
        elev_geoid: -2540.5,
        dist_m: 12.3, dist_total_m: 1500.4,
        Note: 'End-of-drive localization',
      },
    };
    const result = WaypointFeatureSchema.parse(input);
    expect(result.properties.Note).toBe('End-of-drive localization');
  });

  it('rejects a feature with missing required fields', () => {
    const input = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [77.45, 18.44] },
      properties: { sol: 100 },
    };
    expect(() => WaypointFeatureSchema.parse(input)).toThrow();
  });

  it('tolerates extra MMGIS fields via passthrough', () => {
    const input = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [77.45, 18.44] },
      properties: {
        RMC: '87_5154', sol: 100, site: 12, drive: 1,
        lon: 77.45, lat: 18.44, elev_geoid: -2540.5,
        dist_m: 12.3, dist_total_m: 1500.4,
        easting: 4341521.481, northing: 1092582.198,
        roll: 2.3, pitch: 6.8, yaw: 154.9,
      },
    };
    expect(() => WaypointFeatureSchema.parse(input)).not.toThrow();
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
  it('parses a LineString traverse feature (M20 shape)', () => {
    const input = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[77.45, 18.44, -2569.91], [77.46, 18.45, -2570.0]] },
        properties: { sol: 14, fromRMC: '3_0', toRMC: '3_110', length: 6.25 },
      }],
    };
    const result = TraverseFeatureCollectionSchema.parse(input);
    expect(result.features[0].geometry.type).toBe('LineString');
  });

  it('parses a MultiLineString traverse feature (MSL shape)', () => {
    const input = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'MultiLineString',
          coordinates: [[[137.4, -4.6], [137.5, -4.7]], [[137.6, -4.8], [137.7, -4.9]]],
        },
        properties: { sol: 1 },
      }],
    };
    const result = TraverseFeatureCollectionSchema.parse(input);
    expect(result.features[0].geometry.type).toBe('MultiLineString');
  });
});
