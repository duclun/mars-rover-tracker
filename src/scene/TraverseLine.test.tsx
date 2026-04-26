import { describe, it, expect } from 'vitest';
import { latLonToVec3 } from '../data/coords';

describe('TraverseLine coordinate math', () => {
  it('traverse points are placed at radius * 1.003 from globe centre', () => {
    const globeRadius = 1;
    const v = latLonToVec3(18.43, 77.22, globeRadius * 1.003);
    expect(v.length()).toBeCloseTo(1.003, 4);
  });

  it('path starting at Perseverance landing site has correct vector length', () => {
    const pts: [number, number][] = [[18.4437, 77.4509], [18.4437, 77.4509]];
    const vectors = pts.map(([lat, lon]) => latLonToVec3(lat, lon, 1.003));
    for (const v of vectors) expect(v.length()).toBeCloseTo(1.003, 4);
  });
});
