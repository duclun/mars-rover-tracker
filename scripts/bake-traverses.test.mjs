import { describe, it, expect } from 'vitest';
import { extractTraversePath } from './bake-traverses.mjs';

const lineStringFeature = (coords) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: coords },
});

const multiLineFeature = (lines) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'MultiLineString', coordinates: lines },
});

const fc = (...features) => ({ type: 'FeatureCollection', features });

describe('extractTraversePath', () => {
  it('extracts last coord of each LineString as [lat, lon]', () => {
    const result = extractTraversePath(fc(
      lineStringFeature([[77.1, 18.4, -2500], [77.2, 18.5, -2510]])
    ));
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBeCloseTo(18.5);
    expect(result[0][1]).toBeCloseTo(77.2);
  });

  it('handles MultiLineString by using last line last coord', () => {
    const result = extractTraversePath(fc(
      multiLineFeature([
        [[77.1, 18.4, -2500], [77.2, 18.5, -2510]],
        [[77.2, 18.5, -2510], [77.3, 18.6, -2520]],
      ])
    ));
    expect(result[0][0]).toBeCloseTo(18.6);
    expect(result[0][1]).toBeCloseTo(77.3);
  });

  it('deduplicates consecutive identical points', () => {
    const result = extractTraversePath(fc(
      lineStringFeature([[77.1, 18.4, -2500], [77.2, 18.5, -2510]]),
      lineStringFeature([[77.2, 18.5, -2510], [77.2, 18.5, -2510]]), // ends same
      lineStringFeature([[77.2, 18.5, -2510], [77.3, 18.6, -2520]]),
    ));
    // [18.5,77.2] appears at end of feat 1 and end of feat 2 -> deduplicated
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([expect.closeTo(18.5), expect.closeTo(77.2)]);
    expect(result[1]).toEqual([expect.closeTo(18.6), expect.closeTo(77.3)]);
  });

  it('returns empty array for empty feature collection', () => {
    expect(extractTraversePath(fc())).toHaveLength(0);
  });
});
