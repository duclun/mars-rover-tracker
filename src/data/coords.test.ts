import { describe, it, expect } from 'vitest';
import { latLonToVec3, vec3ToLatLon, MARS_MEAN_RADIUS_KM } from './coords';

describe('latLonToVec3', () => {
  it('places the prime meridian + equator on +X axis', () => {
    const v = latLonToVec3(0, 0, 1);
    expect(v.x).toBeCloseTo(1, 6);
    expect(v.y).toBeCloseTo(0, 6);
    expect(v.z).toBeCloseTo(0, 6);
  });

  it('places the +90 east longitude on +Z axis', () => {
    const v = latLonToVec3(0, 90, 1);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.y).toBeCloseTo(0, 6);
    expect(v.z).toBeCloseTo(1, 6);
  });

  it('places the north pole on +Y axis', () => {
    const v = latLonToVec3(90, 0, 1);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.y).toBeCloseTo(1, 6);
    expect(v.z).toBeCloseTo(0, 6);
  });

  it('places the south pole on -Y axis', () => {
    const v = latLonToVec3(-90, 0, 1);
    expect(v.y).toBeCloseTo(-1, 6);
  });

  it('scales by radius', () => {
    const v = latLonToVec3(0, 0, MARS_MEAN_RADIUS_KM);
    expect(v.x).toBeCloseTo(MARS_MEAN_RADIUS_KM, 3);
  });

  it('round-trips through vec3ToLatLon', () => {
    const cases: Array<[number, number]> = [
      [0, 0],
      [18.44, 77.45],   // Perseverance landing area
      [-4.59, 137.44],  // Curiosity landing area
      [45.5, -120.0],
    ];
    for (const [lat, lon] of cases) {
      const v = latLonToVec3(lat, lon, 1);
      const back = vec3ToLatLon(v);
      expect(back.lat).toBeCloseTo(lat, 5);
      expect(back.lon).toBeCloseTo(lon, 5);
    }
  });
});
