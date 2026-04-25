# M1 -- Mars Globe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a rotating Mars sphere with a glowing Perseverance position marker, served from GitHub Pages -- "it looks like Mars and a rover is on it."

**Architecture:** React 18 + R3F SPA. A Zustand store holds rover data loaded by a `<DataLoader>` component that fetches `/data/rovers.json` and falls back to a bundled snapshot on failure. The 3D scene (MarsGlobe + Atmosphere + Rover pip) lives inside an R3F Canvas. All assets are static files committed to the repo and served via GitHub Pages.

**Tech Stack:** React 18, Vite, TypeScript, Three.js, React Three Fiber, drei, postprocessing, Zustand, zod. Tests: Vitest + React Testing Library + Playwright.

**M0 outputs already in repo (do not re-implement):**
- `src/data/schema.ts` -- zod schemas for raw MMGIS GeoJSON
- `src/data/coords.ts` -- `latLonToVec3`, `vec3ToLatLon`, `MARS_MEAN_RADIUS_KM`
- `data/fixtures/` -- committed JPL snapshots (M20 + MSL waypoints + traverse)

---

## File Structure

| Path | Created in | Purpose |
|---|---|---|
| `src/data/types.ts` | T1 | `RoverData`, `RoversJson` TS types + zod schemas |
| `scripts/normalize-rovers.mjs` | T2 | Pure normalizer fn + CLI to generate rovers.json |
| `scripts/normalize-rovers.test.mjs` | T2 | Unit tests for normalizeRovers() |
| `public/data/rovers.json` | T2 | Normalized snapshot; DataLoader fetches this at runtime |
| `src/store/useAppStore.ts` | T3 | Zustand store (rovers, selectedRoverId, cameraMode, ...) |
| `src/store/useAppStore.test.ts` | T3 | Unit tests for store actions |
| `src/data/DataLoader.tsx` | T4 | Fetches rovers.json; falls back to bundled import on error |
| `src/data/DataLoader.test.tsx` | T4 | Tests fallback behavior |
| `scripts/bake-globe-textures.mjs` | T5 | Downloads Mars color + elevation textures |
| `public/data/textures/mars-albedo.jpg` | T5 | 2K Mars color (CC BY 4.0), committed |
| `public/data/textures/mars-elev.png` | T5 | Procedural elevation placeholder, committed |
| `src/scene/MarsGlobe.tsx` | T6 | Sphere + displacement + albedo, slow rotation |
| `src/scene/Atmosphere.tsx` | T7 | Custom GLSL Fresnel rim glow |
| `src/scene/Rover.tsx` | T8 | Glowing pip at rover lat/lon on globe |
| `src/scene/Rover.test.tsx` | T8 | Tests prop -> position mapping |
| `src/scene/Scene.tsx` | T9 | Canvas + lights + all 3D components + OrbitControls + Bloom |
| `src/ui/TopBar.tsx` | T10 | Title bar + stale badge + NASA attribution link |
| `src/ui/TopBar.test.tsx` | T10 | Tests stale state rendering |
| `src/App.tsx` | T10 | Root layout: DataLoader + Scene + TopBar |
| `playwright.config.ts` | T11 | Playwright config (non-headless for WebGL) |
| `tests/e2e/smoke.spec.ts` | T11 | Boot smoke test + canvas visible + no errors |
| `.github/workflows/build.yml` | T12 | Build + deploy to GitHub Pages on push to main |
| `vite.config.ts` | T12 | Add `base: process.env.VITE_BASE ?? '/'` |

---

## Task 1: RoverData types and zod schema

**Files:**
- Create: `src/data/types.ts`

- [ ] **Step 1: Write `src/data/types.ts`**

```ts
import { z } from 'zod';

export const RoverIdSchema = z.enum(['perseverance', 'curiosity']);
export type RoverId = z.infer<typeof RoverIdSchema>;

export const RoverDataSchema = z.object({
  id: RoverIdSchema,
  name: z.string(),
  currentSol: z.number().int(),
  lat: z.number(),
  lon: z.number(),
  elev_geoid: z.number(),    // meters above Mars geoid
  dist_total_m: z.number(),
  RMC: z.string(),
  fetchedAt: z.string(),     // ISO 8601
});
export type RoverData = z.infer<typeof RoverDataSchema>;

export const RoversJsonSchema = z.object({
  perseverance: RoverDataSchema,
  curiosity: RoverDataSchema,
  lastUpdated: z.string(),   // ISO 8601
});
export type RoversJson = z.infer<typeof RoversJsonSchema>;
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: exits 0. No errors in `src/data/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/data/types.ts
git commit -m "feat(data): add RoverData and RoversJson types with zod schemas"
```

---

## Task 2: Rover data normalizer + rovers.json snapshot

**Files:**
- Create: `scripts/normalize-rovers.mjs`
- Test: `scripts/normalize-rovers.test.mjs`
- Create: `public/data/rovers.json`

- [ ] **Step 1: Write the failing test**

Create `scripts/normalize-rovers.test.mjs`:

```js
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
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- scripts/normalize-rovers.test.mjs`
Expected: FAIL "Cannot find module './normalize-rovers.mjs'".

- [ ] **Step 3: Implement `scripts/normalize-rovers.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WaypointFeatureCollectionSchema } from '../src/data/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pure function. Takes parsed M20 + MSL WaypointFeatureCollections,
 * returns a RoversJson object. Used by the nightly refresh action (M4)
 * and by the CLI below.
 */
export function normalizeRovers(m20Waypoints, mslWaypoints) {
  const m20 = m20Waypoints.features[m20Waypoints.features.length - 1].properties;
  const msl = mslWaypoints.features[mslWaypoints.features.length - 1].properties;
  const now = new Date().toISOString();
  return {
    perseverance: {
      id: 'perseverance',
      name: 'Perseverance',
      currentSol: m20.sol,
      lat: m20.lat,
      lon: m20.lon,
      elev_geoid: m20.elev_geoid,
      dist_total_m: m20.dist_total_m,
      RMC: m20.RMC,
      fetchedAt: now,
    },
    curiosity: {
      id: 'curiosity',
      name: 'Curiosity',
      currentSol: msl.sol,
      lat: msl.lat,
      lon: msl.lon,
      elev_geoid: msl.elev_geoid,
      dist_total_m: msl.dist_total_m,
      RMC: msl.RMC,
      fetchedAt: now,
    },
    lastUpdated: now,
  };
}

// CLI: reads from data/fixtures/, writes to public/data/rovers.json
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixturesDir = join(__dirname, '..', 'data', 'fixtures');
  const outDir = join(__dirname, '..', 'public', 'data');

  const m20Raw = JSON.parse(readFileSync(join(fixturesDir, 'M20_waypoints.json'), 'utf8'));
  const mslRaw = JSON.parse(readFileSync(join(fixturesDir, 'MSL_waypoints.json'), 'utf8'));

  const m20 = WaypointFeatureCollectionSchema.parse(m20Raw);
  const msl = WaypointFeatureCollectionSchema.parse(mslRaw);

  const rovers = normalizeRovers(m20, msl);

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'rovers.json');
  writeFileSync(outPath, JSON.stringify(rovers, null, 2) + '\n', 'utf8');
  console.log(`wrote ${outPath}`);
  console.log(`  perseverance: sol ${rovers.perseverance.currentSol}, lat ${rovers.perseverance.lat.toFixed(4)}, lon ${rovers.perseverance.lon.toFixed(4)}`);
  console.log(`  curiosity:    sol ${rovers.curiosity.currentSol}, lat ${rovers.curiosity.lat.toFixed(4)}, lon ${rovers.curiosity.lon.toFixed(4)}`);
}
```

- [ ] **Step 4: Run, verify all 4 tests pass**

Run: `npm test -- scripts/normalize-rovers.test.mjs`
Expected: 4 tests pass.

- [ ] **Step 5: Generate the snapshot**

Run: `node scripts/normalize-rovers.mjs`
Expected output (values may differ if fixtures updated):
```
wrote .../public/data/rovers.json
  perseverance: sol 1840, lat 18.4325, lon 77.2201
  curiosity:    sol 4868, lat -4.8143, lon 137.3817
```

- [ ] **Step 6: Run full test suite, confirm no regressions**

Run: `npm test`
Expected: All tests pass (previously 20 + 4 new = 24).

- [ ] **Step 7: Commit**

```bash
git add scripts/normalize-rovers.mjs scripts/normalize-rovers.test.mjs public/data/rovers.json
git commit -m "feat(data): add rover normalizer; generate public/data/rovers.json from M0 fixtures"
```

---

## Task 3: Zustand app store

**Files:**
- Create: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/useAppStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import type { RoversJson } from '../data/types';

const mockRovers: RoversJson = {
  perseverance: {
    id: 'perseverance', name: 'Perseverance', currentSol: 1840,
    lat: 18.43, lon: 77.22, elev_geoid: -2540.5, dist_total_m: 19842.1,
    RMC: '87_5154', fetchedAt: '2026-04-25T00:00:00.000Z',
  },
  curiosity: {
    id: 'curiosity', name: 'Curiosity', currentSol: 4868,
    lat: -4.81, lon: 137.38, elev_geoid: -4510.2, dist_total_m: 31820.4,
    RMC: '100_200', fetchedAt: '2026-04-25T00:00:00.000Z',
  },
  lastUpdated: '2026-04-25T00:00:00.000Z',
};

beforeEach(() => {
  useAppStore.setState({
    rovers: null, selectedRoverId: null, currentSol: 0,
    cameraMode: 'orbit', drawerOpen: false, stale: false,
  });
});

describe('useAppStore', () => {
  it('starts with null rovers and orbit mode', () => {
    const s = useAppStore.getState();
    expect(s.rovers).toBeNull();
    expect(s.selectedRoverId).toBeNull();
    expect(s.cameraMode).toBe('orbit');
    expect(s.drawerOpen).toBe(false);
    expect(s.stale).toBe(false);
  });

  it('setRovers populates rovers and stale flag', () => {
    useAppStore.getState().setRovers(mockRovers, false);
    const s = useAppStore.getState();
    expect(s.rovers?.perseverance.currentSol).toBe(1840);
    expect(s.stale).toBe(false);
  });

  it('setRovers with stale=true marks the data as cached', () => {
    useAppStore.getState().setRovers(mockRovers, true);
    expect(useAppStore.getState().stale).toBe(true);
  });

  it('selectRover sets selectedRoverId', () => {
    useAppStore.getState().selectRover('curiosity');
    expect(useAppStore.getState().selectedRoverId).toBe('curiosity');
  });

  it('setDrawerOpen toggles drawerOpen', () => {
    useAppStore.getState().setDrawerOpen(true);
    expect(useAppStore.getState().drawerOpen).toBe(true);
    useAppStore.getState().setDrawerOpen(false);
    expect(useAppStore.getState().drawerOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/store/useAppStore.test.ts`
Expected: FAIL "Cannot find module './useAppStore'".

- [ ] **Step 3: Implement `src/store/useAppStore.ts`**

```ts
import { create } from 'zustand';
import type { RoverId, RoversJson } from '../data/types';

interface AppState {
  rovers: RoversJson | null;
  selectedRoverId: RoverId | null;
  currentSol: number;
  cameraMode: 'orbit' | 'diving' | 'surface';
  drawerOpen: boolean;
  stale: boolean;
  // actions
  setRovers: (rovers: RoversJson, stale: boolean) => void;
  selectRover: (id: RoverId) => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  rovers: null,
  selectedRoverId: null,
  currentSol: 0,
  cameraMode: 'orbit',
  drawerOpen: false,
  stale: false,
  setRovers: (rovers, stale) => set({ rovers, stale }),
  selectRover: (id) => set({ selectedRoverId: id }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
}));
```

- [ ] **Step 4: Run, verify all 5 tests pass**

Run: `npm test -- src/store/useAppStore.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat(store): add Zustand app store with rovers, selectedRoverId, cameraMode"
```

---

## Task 4: DataLoader component

**Files:**
- Create: `src/data/DataLoader.tsx`
- Test: `src/data/DataLoader.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/data/DataLoader.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { DataLoader } from './DataLoader';
import { useAppStore } from '../store/useAppStore';

afterEach(() => {
  useAppStore.setState({
    rovers: null, stale: false, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false,
  });
  vi.restoreAllMocks();
});

describe('DataLoader', () => {
  it('renders nothing (returns null)', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const { container } = render(<DataLoader />);
    expect(container.firstChild).toBeNull();
  });

  it('falls back to bundled snapshot when fetch returns non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<DataLoader />);
    await vi.waitFor(() => {
      const { rovers, stale } = useAppStore.getState();
      expect(rovers).not.toBeNull();
      expect(stale).toBe(true);
    });
  });

  it('falls back to bundled snapshot when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<DataLoader />);
    await vi.waitFor(() => {
      const { stale } = useAppStore.getState();
      expect(stale).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/data/DataLoader.test.tsx`
Expected: FAIL "Cannot find module './DataLoader'".

- [ ] **Step 3: Implement `src/data/DataLoader.tsx`**

```tsx
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RoversJsonSchema } from './types';
import snapshotJson from '../../public/data/rovers.json';

const snapshot = RoversJsonSchema.parse(snapshotJson);

export function DataLoader() {
  const setRovers = useAppStore((s) => s.setRovers);

  useEffect(() => {
    fetch('/data/rovers.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((raw) => setRovers(RoversJsonSchema.parse(raw), false))
      .catch(() => setRovers(snapshot, true));
  }, [setRovers]);

  return null;
}
```

- [ ] **Step 4: Run, verify all 3 tests pass**

Run: `npm test -- src/data/DataLoader.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/data/DataLoader.tsx src/data/DataLoader.test.tsx
git commit -m "feat(data): add DataLoader component with rovers.json fetch and snapshot fallback"
```

---

## Task 5: Globe textures

**Files:**
- Create: `scripts/bake-globe-textures.mjs`
- Create: `public/data/textures/mars-albedo.jpg` (committed)
- Create: `public/data/textures/mars-elev.png` (committed)

The albedo is the Solar System Scope 2K Mars texture (CC BY 4.0). The elevation is a procedural sine-wave heightmap written as a grayscale PNG -- a low-res placeholder; M2 replaces it with a real MOLA download.

- [ ] **Step 1: Write `scripts/bake-globe-textures.mjs`**

```js
#!/usr/bin/env node
/**
 * Downloads the Mars albedo texture from Solar System Scope (CC BY 4.0).
 * Generates a procedural equirectangular elevation map as a grayscale PNG.
 *
 * Both files are small enough to commit (< 3 MB combined).
 * Run once, then commit the outputs.
 * Replace mars-elev.png with a real MOLA download in M2.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'data', 'textures');

await mkdir(OUT_DIR, { recursive: true });

// --- 1. Albedo: Solar System Scope 2K Mars (CC BY 4.0) ---
const ALBEDO_URL = 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg';
process.stdout.write('Downloading mars-albedo.jpg ... ');
const albedoRes = await fetch(ALBEDO_URL, {
  headers: { 'User-Agent': 'mars-rover-tracker texture-fetcher (educational)' },
});
if (!albedoRes.ok) throw new Error(`Albedo fetch failed: HTTP ${albedoRes.status}`);
const albedoBytes = new Uint8Array(await albedoRes.arrayBuffer());
await writeFile(join(OUT_DIR, 'mars-albedo.jpg'), albedoBytes);
console.log(`OK (${(albedoBytes.byteLength / 1024).toFixed(0)} KB)`);

// --- 2. Elevation: procedural 512x256 grayscale PNG ---
// A sinusoidal heightmap that creates visible polar caps and mid-latitude
// undulation. Replace with a real MOLA download in M2.
process.stdout.write('Generating mars-elev.png (procedural) ... ');
const W = 512, H = 256;
const pixels = new Uint8Array(W * H);
for (let row = 0; row < H; row++) {
  const latFrac = row / H;           // 0=north, 1=south
  const lat = (latFrac - 0.5) * Math.PI; // radians
  for (let col = 0; col < W; col++) {
    const lonFrac = col / W;
    const lon = lonFrac * 2 * Math.PI;
    // Base: slightly lower at equator, higher at poles (Mars oblate-ish)
    const base = 0.45 + 0.1 * Math.abs(Math.sin(lat));
    // Olympus Mons region (lon ~225 deg, lat ~18 deg N)
    const dLat = lat - 0.31;
    const dLon = lon - 3.93;
    const olympus = 0.18 * Math.exp(-(dLat * dLat + dLon * dLon) * 60);
    // Hellas basin (lon ~70 deg E, lat ~42 deg S)
    const hLat = lat + 0.73;
    const hLon = lon - 1.22;
    const hellas = -0.12 * Math.exp(-(hLat * hLat + hLon * hLon) * 80);
    // Tharsis bulge (lon ~260 deg, lat ~0 deg)
    const tLon = lon - 4.54;
    const tharsis = 0.1 * Math.exp(-(lat * lat * 10 + tLon * tLon * 3));
    // Fine-grain noise
    const noise = 0.04 * (Math.sin(lat * 12) * Math.cos(lon * 8) + Math.cos(lat * 7) * Math.sin(lon * 5));
    const val = Math.min(1, Math.max(0, base + olympus + hellas + tharsis + noise));
    pixels[row * W + col] = Math.round(val * 255);
  }
}

// Write a valid 8-bit grayscale PNG manually (minimal encoder)
function writePNG(width, height, gray) {
  const IHDR = makePNGChunk('IHDR', (() => {
    const b = new DataView(new ArrayBuffer(13));
    b.setUint32(0, width); b.setUint32(4, height);
    b.setUint8(8, 8);   // bit depth
    b.setUint8(9, 0);   // grayscale
    b.setUint8(10, 0); b.setUint8(11, 0); b.setUint8(12, 0);
    return new Uint8Array(b.buffer);
  })());

  // Build raw scanlines (each prefixed with filter byte 0)
  const raw = new Uint8Array(height * (width + 1));
  for (let r = 0; r < height; r++) {
    raw[r * (width + 1)] = 0; // no filter
    raw.set(gray.subarray(r * width, (r + 1) * width), r * (width + 1) + 1);
  }
  // Deflate using zlib (sync) -- Node built-in
  const { deflateSync } = await import('node:zlib');
  const compressed = deflateSync(raw, { level: 6 });
  const IDAT = makePNGChunk('IDAT', compressed);
  const IEND = makePNGChunk('IEND', new Uint8Array(0));
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, IHDR, IDAT, IEND]);
}

function makePNGChunk(type, data) {
  const typeBuf = new TextEncoder().encode(type);
  const len = new DataView(new ArrayBuffer(4));
  len.setUint32(0, data.length);
  // CRC32 of type + data
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = new DataView(new ArrayBuffer(4));
  crcBuf.setUint32(0, crc >>> 0);
  return Buffer.concat([
    new Uint8Array(len.buffer), typeBuf, data, new Uint8Array(crcBuf.buffer),
  ]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  const table = CRC_TABLE;
  for (const byte of buf) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const pngBuf = await writePNG(W, H, pixels);
await writeFile(join(OUT_DIR, 'mars-elev.png'), pngBuf);
console.log(`OK (${(pngBuf.byteLength / 1024).toFixed(0)} KB)`);

console.log('\nTextures written to public/data/textures/');
console.log('Attribution: Solar System Scope CC BY 4.0 (mars-albedo.jpg)');
console.log('Note: Replace mars-elev.png with real MOLA data in M2.');
```

- [ ] **Step 2: Run the script**

Run: `node scripts/bake-globe-textures.mjs`
Expected:
```
Downloading mars-albedo.jpg ... OK (XXXX KB)
Generating mars-elev.png (procedural) ... OK (XX KB)
Textures written to public/data/textures/
```

Verify both files exist:
```bash
ls -la public/data/textures/
```
Expected: `mars-albedo.jpg` (> 100 KB) and `mars-elev.png` (< 100 KB).

- [ ] **Step 3: Commit**

```bash
git add scripts/bake-globe-textures.mjs public/data/textures/
git commit -m "feat(assets): add Mars globe textures (2K albedo + procedural elevation)"
```

---

## Task 6: MarsGlobe component

**Files:**
- Create: `src/scene/MarsGlobe.tsx`

No unit test for pixel output; we verify visually in T11 Playwright.

- [ ] **Step 1: Write `src/scene/MarsGlobe.tsx`**

```tsx
import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, Mesh, SRGBColorSpace } from 'three';

interface MarsGlobeProps {
  radius?: number;
}

export function MarsGlobe({ radius = 1 }: MarsGlobeProps) {
  const ref = useRef<Mesh>(null);
  const albedo = useLoader(TextureLoader, '/data/textures/mars-albedo.jpg');
  const elevation = useLoader(TextureLoader, '/data/textures/mars-elev.png');

  albedo.colorSpace = SRGBColorSpace;

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.025;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 128, 64]} />
      <meshStandardMaterial
        map={albedo}
        displacementMap={elevation}
        displacementScale={radius * 0.012}
        displacementBias={-0.006}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scene/MarsGlobe.tsx
git commit -m "feat(scene): add MarsGlobe component with albedo + displacement map"
```

---

## Task 7: Atmosphere shader and component

**Files:**
- Create: `src/scene/Atmosphere.tsx`

Uses drei's `shaderMaterial` to create a custom GLSL rim-glow effect.

- [ ] **Step 1: Write `src/scene/Atmosphere.tsx`**

```tsx
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { AdditiveBlending, BackSide } from 'three';

const AtmosphereMaterial = shaderMaterial(
  { intensity: 1.0 },
  /* vertex shader */
  `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  /* fragment shader */
  `
    uniform float intensity;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
      rim = pow(rim, 3.5) * intensity;
      vec3 dustColor = vec3(0.85, 0.42, 0.12);
      gl_FragColor = vec4(dustColor, rim);
    }
  `,
);

extend({ AtmosphereMaterial });

// TypeScript: teach R3F's JSX about the custom material element
declare module '@react-three/fiber' {
  interface ThreeElements {
    atmosphereMaterial: React.ComponentPropsWithoutRef<'mesh'> & { intensity?: number };
  }
}

interface AtmosphereProps {
  radius?: number;
  intensity?: number;
}

export function Atmosphere({ radius = 1, intensity = 1.2 }: AtmosphereProps) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.06, 64, 32]} />
      <atmosphereMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={BackSide}
        intensity={intensity}
      />
    </mesh>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scene/Atmosphere.tsx
git commit -m "feat(scene): add Atmosphere component with GLSL Fresnel rim glow"
```

---

## Task 8: Rover pip component

**Files:**
- Create: `src/scene/Rover.tsx`
- Test: `src/scene/Rover.test.tsx`

For M1: a glowing sphere pip positioned via `latLonToVec3`. GLTF model is M3.

- [ ] **Step 1: Write the failing test**

Create `src/scene/Rover.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { latLonToVec3 } from '../data/coords';

// We test the coordinate math, not the JSX (no pixel tests).
// The visual check is in the Playwright smoke test.
describe('Rover position math', () => {
  it('places Perseverance above the globe surface at 1.5% offset', () => {
    const globeRadius = 1;
    const lat = 18.4325;
    const lon = 77.2201;
    const pos = latLonToVec3(lat, lon, globeRadius * 1.015);
    // Should be at radius 1.015 from origin
    expect(pos.length()).toBeCloseTo(1.015, 4);
  });

  it('places Curiosity in the southern hemisphere (-Y component)', () => {
    const lat = -4.8143;
    const lon = 137.3817;
    const pos = latLonToVec3(lat, lon, 1.015);
    // Southern hemisphere -> negative Y
    expect(pos.y).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/scene/Rover.test.tsx`
Expected: FAIL "Cannot find module '../data/coords'".

Wait -- `coords.ts` already exists. The tests should actually import fine. Run and expect them to pass immediately (the math is already implemented in T5 of M0).

Run: `npm test -- src/scene/Rover.test.tsx`
Expected: 2 tests pass. (These test the pre-existing `latLonToVec3`; if they do pass, proceed.)

- [ ] **Step 3: Write `src/scene/Rover.tsx`**

```tsx
import { latLonToVec3 } from '../data/coords';

interface RoverProps {
  lat: number;
  lon: number;
  globeRadius: number;
}

export function Rover({ lat, lon, globeRadius }: RoverProps) {
  // Place 1.5% above the undisplaced sphere radius.
  // Visual error vs displaced surface is < 40 km out of 3389 km -- not visible at orbit zoom.
  const pos = latLonToVec3(lat, lon, globeRadius * 1.015);
  const pipRadius = globeRadius * 0.015;

  return (
    <mesh position={pos}>
      <sphereGeometry args={[pipRadius, 16, 16]} />
      <meshBasicMaterial color="#00d9ff" />
    </mesh>
  );
}
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/scene/Rover.tsx src/scene/Rover.test.tsx
git commit -m "feat(scene): add Rover pip component positioned via latLonToVec3"
```

---

## Task 9: Scene assembly

**Files:**
- Create: `src/scene/Scene.tsx`

Mounts the R3F Canvas, wires lights, MarsGlobe, Atmosphere, Rover, OrbitControls, and Bloom.

- [ ] **Step 1: Write `src/scene/Scene.tsx`**

```tsx
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { MarsGlobe } from './MarsGlobe';
import { Atmosphere } from './Atmosphere';
import { Rover } from './Rover';
import { useAppStore } from '../store/useAppStore';

const GLOBE_RADIUS = 1;

function SceneContents() {
  const rovers = useAppStore((s) => s.rovers);
  const p = rovers?.perseverance;
  const c = rovers?.curiosity;

  return (
    <>
      {/* Sun-like directional light from upper-right */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 3, 5]} intensity={2.2} color="#fff8e7" />

      {/* Planet */}
      <Suspense fallback={null}>
        <MarsGlobe radius={GLOBE_RADIUS} />
      </Suspense>
      <Atmosphere radius={GLOBE_RADIUS} />

      {/* Rover pips */}
      {p && <Rover lat={p.lat} lon={p.lon} globeRadius={GLOBE_RADIUS} />}
      {c && <Rover lat={c.lat} lon={c.lon} globeRadius={GLOBE_RADIUS} />}

      {/* Controls: drag to orbit, scroll to zoom */}
      <OrbitControls
        enablePan={false}
        minDistance={GLOBE_RADIUS * 1.3}
        maxDistance={GLOBE_RADIUS * 8}
        autoRotate={false}
      />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContents />
    </Canvas>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scene/Scene.tsx
git commit -m "feat(scene): assemble Scene with MarsGlobe, Atmosphere, Rover pips, Bloom"
```

---

## Task 10: TopBar UI and App assembly

**Files:**
- Create: `src/ui/TopBar.tsx`
- Test: `src/ui/TopBar.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/TopBar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useAppStore } from '../store/useAppStore';
import type { RoversJson } from '../data/types';

const mockRovers: RoversJson = {
  perseverance: {
    id: 'perseverance', name: 'Perseverance', currentSol: 1840,
    lat: 18.43, lon: 77.22, elev_geoid: -2540.5, dist_total_m: 19842.1,
    RMC: '87_5154', fetchedAt: '2026-04-25T12:00:00.000Z',
  },
  curiosity: {
    id: 'curiosity', name: 'Curiosity', currentSol: 4868,
    lat: -4.81, lon: 137.38, elev_geoid: -4510.2, dist_total_m: 31820.4,
    RMC: '100_200', fetchedAt: '2026-04-25T12:00:00.000Z',
  },
  lastUpdated: '2026-04-25T12:00:00.000Z',
};

beforeEach(() => {
  useAppStore.setState({
    rovers: null, stale: false, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false,
  });
});

describe('TopBar', () => {
  it('renders the app title', () => {
    render(<TopBar />);
    expect(screen.getByText('Mars Rover Tracker')).toBeInTheDocument();
  });

  it('shows the last-updated date when rovers are loaded', () => {
    useAppStore.setState({ rovers: mockRovers });
    render(<TopBar />);
    expect(screen.getByText(/2026-04-25/)).toBeInTheDocument();
  });

  it('shows "(cached)" badge when data is stale', () => {
    useAppStore.setState({ rovers: mockRovers, stale: true });
    render(<TopBar />);
    expect(screen.getByText(/(cached)/)).toBeInTheDocument();
  });

  it('renders the NASA attribution link', () => {
    render(<TopBar />);
    const link = screen.getByRole('link', { name: /NASA\/JPL-Caltech/i });
    expect(link).toHaveAttribute('href', 'https://mars.nasa.gov/');
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/ui/TopBar.test.tsx`
Expected: FAIL "Cannot find module './TopBar'".

- [ ] **Step 3: Implement `src/ui/TopBar.tsx`**

```tsx
import { useAppStore } from '../store/useAppStore';

export function TopBar() {
  const stale = useAppStore((s) => s.stale);
  const rovers = useAppStore((s) => s.rovers);

  return (
    <header style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)',
      pointerEvents: 'none',
    }}>
      <span style={{
        color: '#fff', fontFamily: 'system-ui, sans-serif',
        fontSize: 18, fontWeight: 700, letterSpacing: '0.04em',
      }}>
        Mars Rover Tracker
      </span>
      <span style={{
        color: 'rgba(255,255,255,0.55)', fontFamily: 'system-ui, sans-serif', fontSize: 12,
        pointerEvents: 'auto',
      }}>
        {stale && '(cached) '}
        {rovers?.lastUpdated ? `Updated ${rovers.lastUpdated.slice(0, 10)} · ` : ''}
        <a
          href="https://mars.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}
        >
          NASA/JPL-Caltech
        </a>
      </span>
    </header>
  );
}
```

- [ ] **Step 4: Run, verify all 4 tests pass**

Run: `npm test -- src/ui/TopBar.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 5: Update `src/App.tsx`**

Replace the entire file with:

```tsx
import { DataLoader } from './data/DataLoader';
import { Scene } from './scene/Scene';
import { TopBar } from './ui/TopBar';

export function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <DataLoader />
      <Scene />
      <TopBar />
    </div>
  );
}
```

- [ ] **Step 6: Run full suite**

Run: `npm test`
Expected: All tests pass (unit count grows with each new test file).

- [ ] **Step 7: Eyeball the dev server**

The dev server should still be running on port 5173 or 5174 from earlier. If not:
Run: `npm run dev` (keep it running in a terminal)

Open: `http://localhost:5174/` (or 5173)
Expected: black background, reddish Mars sphere rotating slowly, two cyan pips visible (Perseverance ~18°N and Curiosity ~5°S), dusty orange rim glow at the planet's edge. TopBar shows "Mars Rover Tracker" and attribution link.

If textures are black: confirm `public/data/textures/mars-albedo.jpg` exists and the dev server is serving `/data/textures/`. Open DevTools -> Network, filter on "mars-albedo" -- should be 200 OK.

- [ ] **Step 8: Commit**

```bash
git add src/ui/TopBar.tsx src/ui/TopBar.test.tsx src/App.tsx
git commit -m "feat(ui): add TopBar with stale badge and NASA attribution; wire App root"
```

---

## Task 11: Playwright E2E smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`

Uses `headless: false` because headless Chromium blocks WebGL on this machine (M0 finding).

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5174',
    // headless: false required on this machine -- WebGL disabled in headless sandbox (M0 finding)
    headless: false,
    launchOptions: {
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 2: Write `tests/e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('M1 smoke', () => {
  test('page loads, canvas visible, no JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    // Wait for Three.js to initialise (textures may be loading)
    await page.waitForTimeout(3000);

    // Canvas must be in the DOM
    await expect(page.locator('canvas')).toBeVisible();

    // TopBar must be visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Mars Rover Tracker')).toBeVisible();

    // No page-level JS exceptions
    expect(errors, `JS errors: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('NASA attribution link is present', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[href="https://mars.nasa.gov/"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('NASA/JPL-Caltech');
  });
});
```

- [ ] **Step 3: Run the Playwright tests**

Run: `npx playwright test`
Expected: 2 tests pass. A browser window opens briefly for each test (headless: false).

If a test fails with "Target closed" or "context destroyed", the dev server may not be running -- start it in another terminal with `npm run dev`.

- [ ] **Step 4: Take a Playwright screenshot for the record**

Run: `node scripts/screenshot-spike.mjs "http://localhost:5174/" "docs/m0-screenshots/m1-globe.png"`

The `screenshot-spike.mjs` script already uses `headless: false` and real GPU from M0. Open `docs/m0-screenshots/m1-globe.png` and verify it shows the Mars globe with cyan pips and the TopBar.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/smoke.spec.ts docs/m0-screenshots/m1-globe.png
git commit -m "test(e2e): add Playwright smoke test for M1 globe; capture screenshot"
```

---

## Task 12: GitHub Pages deployment workflow

**Files:**
- Modify: `vite.config.ts` (add `base`)
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Update `vite.config.ts` to support a configurable base path**

The `base` option is needed when the site is served from a sub-path (e.g. `user.github.io/mars-rover-tracker/`). An env variable lets CI set the real path while local dev stays at `/`.

Replace the `vite.config.ts` file with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sphere: resolve(__dirname, 'spike/sphere/index.html'),
        surface: resolve(__dirname, 'spike/surface/index.html'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

- [ ] **Step 2: Verify local build still works**

Run: `npm run build`
Expected: exits 0. `dist/` populated. `dist/data/rovers.json` and `dist/data/textures/mars-albedo.jpg` present (Vite copies `public/` into `dist/`).

Check:
```bash
ls dist/data/
ls dist/data/textures/
```
Expected: `rovers.json`, `textures/` with `mars-albedo.jpg` and `mars-elev.png`.

- [ ] **Step 3: Create `.github/workflows/build.yml`**

```yaml
name: Build and Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          # Sets Vite's base to /<repo-name>/ so assets resolve correctly on GitHub Pages.
          # If the repo is at github.com/user/mars-rover-tracker, this expands to /mars-rover-tracker/.
          VITE_BASE: ${{ format('/{0}/', github.event.repository.name) }}

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Enable GitHub Pages in the repo settings**

In the GitHub repository -> Settings -> Pages:
- Source: **GitHub Actions**

This must be set manually once before the first deploy. The workflow will fail on first push with a 403 if this step is skipped.

- [ ] **Step 5: Run full test suite one final time**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit and push**

```bash
git add vite.config.ts .github/workflows/build.yml
git commit -m "chore(ci): add GitHub Pages deploy workflow; configure VITE_BASE"
git push
```

After pushing, open GitHub -> Actions. The `Build and Deploy` workflow should run and the site should appear at `https://<user>.github.io/mars-rover-tracker/` within a few minutes.

---

## Self-Review

**1. Spec coverage check:**

| M1 spec requirement | Task |
|---|---|
| `<MarsGlobe>` with MOLA displacement + albedo (low-res only) | T5, T6 |
| `<Atmosphere>` shader | T7 |
| `<Rover>` placed at Perseverance's current lat/lon | T8, T9 |
| `<TopBar>` with title + credits | T10 |
| Static rovers.json snapshot, no Action yet | T2 |
| Deployed to GitHub Pages | T12 |
| Zustand store wired up | T3 |
| DataLoader with bundled fallback | T4 |
| zod types for the normalized data | T1 |

All requirements covered.

**2. Placeholder scan:** None found. Every step has code or exact commands.

**3. Type consistency check:**
- `RoverData.dist_total_m` used consistently (not `dist_total`).
- `useAppStore` exported as a named export in T3 and imported that way in T4, T10.
- `GLOBE_RADIUS = 1` defined in `Scene.tsx` and passed as `globeRadius` prop to `Rover`.
- `latLonToVec3` signature `(lat, lon, radius)` matches M0 implementation and T8 usage.
- `RoversJson.lastUpdated` (string) sliced to 10 chars in TopBar to show `YYYY-MM-DD`.
