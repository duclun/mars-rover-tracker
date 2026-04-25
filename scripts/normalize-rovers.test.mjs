import { describe, it, expect } from 'vitest';
import { normalizeRovers } from './normalize-rovers.mjs';

const m20 = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [77.22, 18.43] },
    properties: {
      RMC: '87_5154', sol: 1840, site: 87, drive: 5154,
      lon: 77.22, lat: 18.43, elev_geoid: -2540.5,
      dist_m: 12.3, dist_total_m: 19842.1,
    },
  }],
};

const msl = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [137.38, -4.81] },
    properties: {
      RMC: '100_200', sol: 4868, site: 100, drive: 200,
      lon: 137.38, lat: -4.81, elev_geoid: -4510.2,
      dist_m: 8.1, dist_total_m: 31820.4,
    },
  }],
};

describe('normalizeRovers', () => {
  it('extracts Perseverance from the last M20 waypoint feature', () => {
    const result = normalizeRovers(m20, msl);
    expect(result.perseverance.id).toBe('perseverance');
    expect(result.perseverance.name).toBe('Perseverance');
    expect(result.perseverance.currentSol).toBe(1840);
    expect(result.perseverance.lat).toBeCloseTo(18.43);
    expect(result.perseverance.lon).toBeCloseTo(77.22);
    expect(result.perseverance.elev_geoid).toBeCloseTo(-2540.5);
    expect(result.perseverance.dist_total_m).toBeCloseTo(19842.1);
    expect(result.perseverance.RMC).toBe('87_5154');
  });

  it('extracts Curiosity from the last MSL waypoint feature', () => {
    const result = normalizeRovers(m20, msl);
    expect(result.curiosity.id).toBe('curiosity');
    expect(result.curiosity.name).toBe('Curiosity');
    expect(result.curiosity.currentSol).toBe(4868);
    expect(result.curiosity.lat).toBeCloseTo(-4.81);
    expect(result.curiosity.lon).toBeCloseTo(137.38);
  });

  it('picks the last feature when there are multiple', () => {
    const multi = {
      ...m20,
      features: [
        { ...m20.features[0], properties: { ...m20.features[0].properties, sol: 1 } },
        { ...m20.features[0], properties: { ...m20.features[0].properties, sol: 9999, RMC: 'last_rmc' } },
      ],
    };
    const result = normalizeRovers(multi, msl);
    expect(result.perseverance.currentSol).toBe(9999);
    expect(result.perseverance.RMC).toBe('last_rmc');
  });

  it('includes a lastUpdated ISO timestamp', () => {
    const result = normalizeRovers(m20, msl);
    expect(result.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
