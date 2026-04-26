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

  it('maxIndex slices path to first N points (math check)', () => {
    const path: [number, number][] = [
      [18.43, 77.22],
      [18.44, 77.23],
      [18.45, 77.24],
    ];
    const maxIndex = 2;
    const sliced = path.slice(0, maxIndex);
    expect(sliced).toHaveLength(2);
    const v = latLonToVec3(sliced[1][0], sliced[1][1], 1.003);
    expect(v.length()).toBeCloseTo(1.003, 4);
  });
});
