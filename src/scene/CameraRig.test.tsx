import { describe, it, expect } from 'vitest';
import { latLonToVec3 } from '../data/coords';

describe('CameraRig coordinate math', () => {
  it('target position for Perseverance is at the correct distance from origin', () => {
    const dist = 3;
    const v = latLonToVec3(18.43, 77.22, dist);
    expect(v.length()).toBeCloseTo(dist, 4);
  });

  it('target position for Curiosity is at the correct distance from origin', () => {
    const dist = 2.5;
    const v = latLonToVec3(-4.81, 137.38, dist);
    expect(v.length()).toBeCloseTo(dist, 4);
  });

  it('two rovers produce different target positions', () => {
    const p = latLonToVec3(18.43, 77.22, 3);
    const c = latLonToVec3(-4.81, 137.38, 3);
    expect(p.distanceTo(c)).toBeGreaterThan(0.1);
  });
});
