import { describe, it, expect } from 'vitest';
import { extractWaypoints } from './bake-waypoints.mjs';

function point(properties) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [properties.lon, properties.lat, properties.elev_geoid ?? 0] },
    properties,
  };
}

const fc = (...features) => ({ type: 'FeatureCollection', features });

describe('extractWaypoints', () => {
  it('extracts lat, lon, sol, distKm, note from each feature', () => {
    const result = extractWaypoints(fc(
      point({ sol: 100, lat: 18.43, lon: 77.22, dist_total_m: 500, note: 'First stop' }),
      point({ sol: 200, lat: 18.50, lon: 77.30, dist_total_m: 1200, note: '' }),
    ));
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ lat: 18.43, lon: 77.22, sol: 100, distKm: 0.5, note: 'First stop' });
    expect(result[1]).toEqual({ lat: 18.50, lon: 77.30, sol: 200, distKm: 1.2, note: '' });
  });

  it('sorts by sol ascending', () => {
    const result = extractWaypoints(fc(
      point({ sol: 300, lat: 18.6, lon: 77.4, dist_total_m: 2000, note: '' }),
      point({ sol: 100, lat: 18.4, lon: 77.2, dist_total_m: 500, note: '' }),
      point({ sol: 200, lat: 18.5, lon: 77.3, dist_total_m: 1000, note: '' }),
    ));
    expect(result.map(w => w.sol)).toEqual([100, 200, 300]);
  });

  it('uses empty string when note is missing', () => {
    const result = extractWaypoints(fc(
      point({ sol: 1, lat: 18.4, lon: 77.2, dist_total_m: 0 }),
    ));
    expect(result[0].note).toBe('');
  });

  it('returns empty array for empty FeatureCollection', () => {
    expect(extractWaypoints(fc())).toHaveLength(0);
  });
});
