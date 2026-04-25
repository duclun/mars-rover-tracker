import { describe, it, expect } from 'vitest';
import { dataToHeightfield } from './bake-dem.mjs';

describe('dataToHeightfield', () => {
  it('packs a 2x2 elevation grid into a 16-bit heightfield', () => {
    const elevations = new Float32Array([0, 100, 200, 300]); // meters
    const result = dataToHeightfield(elevations, 2, 2);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.minElev).toBe(0);
    expect(result.maxElev).toBe(300);
    expect(result.bin).toBeInstanceOf(Uint8Array);
    expect(result.bin.byteLength).toBe(2 * 2 * 2); // 16-bit per cell

    // Check we can recover the elevations from the bin
    const view = new DataView(result.bin.buffer, result.bin.byteOffset, result.bin.byteLength);
    expect(view.getUint16(0, true)).toBe(0);     // min -> 0
    expect(view.getUint16(6, true)).toBe(65535); // max -> 65535
  });

  it('throws when grid size does not match data length', () => {
    expect(() => dataToHeightfield(new Float32Array([1, 2]), 2, 2)).toThrow();
  });

  it('handles a constant elevation field', () => {
    const elevations = new Float32Array([50, 50, 50, 50]);
    const result = dataToHeightfield(elevations, 2, 2);
    expect(result.minElev).toBe(50);
    expect(result.maxElev).toBe(50);
    // When min === max, all cells encode as 0 (avoid divide-by-zero)
    const view = new DataView(result.bin.buffer);
    expect(view.getUint16(0, true)).toBe(0);
  });
});
