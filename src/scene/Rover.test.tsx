import { describe, it, expect } from 'vitest';
import { latLonToVec3 } from '../data/coords';

describe('Rover position math', () => {
  it('places Perseverance above the globe surface at 1.5% offset', () => {
    const globeRadius = 1;
    const lat = 18.4325;
    const lon = 77.2201;
    const pos = latLonToVec3(lat, lon, globeRadius * 1.015);
    expect(pos.length()).toBeCloseTo(1.015, 4);
  });

  it('places Curiosity in the southern hemisphere (-Y component)', () => {
    const lat = -4.8143;
    const lon = 137.3817;
    const pos = latLonToVec3(lat, lon, 1.015);
    expect(pos.y).toBeLessThan(0);
  });
});
