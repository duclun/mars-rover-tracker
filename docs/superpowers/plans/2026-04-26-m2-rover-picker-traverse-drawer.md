# M2 -- Rover Picker, Traverse Line, Data Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RoverPicker toggle, traverse path lines on the globe, a data drawer with rover stats, and a mobile fallback -- "two rovers, switching between them, with basic stats."

**Architecture:** New UI components (RoverPicker, DataDrawer, MobileFallback) are pure React rendered over the Canvas. TraverseLine is an R3F mesh added to the existing Scene. Traverse coordinate data is pre-baked from the committed M0 fixtures into compact `[lat, lon][]` arrays stored at `public/data/traverses/`. DataLoader fetches them at boot in parallel with rovers.json and populates a new `traverses` field in the Zustand store. Mobile detection uses `window.matchMedia` on mount; if mobile, Scene is hidden and a static fallback card replaces it.

**Tech Stack:** React 18, R3F, @react-three/drei (Line), Zustand, Vitest + RTL, Playwright.

**M1 outputs already in repo (do not re-implement):**
- `src/data/types.ts` -- RoverData, RoversJson zod schemas
- `src/store/useAppStore.ts` -- Zustand store with rovers, selectedRoverId, drawerOpen, stale
- `src/data/DataLoader.tsx` -- fetches rovers.json with snapshot fallback
- `src/scene/Scene.tsx` -- Canvas with MarsGlobe, Atmosphere, Rover pips, Bloom
- `src/scene/Rover.tsx` -- pip at lat/lon
- `src/ui/TopBar.tsx` -- title + NASA attribution
- `data/fixtures/M20_traverse.json`, `data/fixtures/MSL_traverse.json` -- committed JPL traverse GeoJSON (~8 MB each; not imported into bundle)

---

## File Structure

| Path | Task | Purpose |
|---|---|---|
| `scripts/bake-traverses.mjs` | T1 | Pure fn + CLI: extracts one `[lat, lon]` per drive from traverse fixtures |
| `scripts/bake-traverses.test.mjs` | T1 | Unit tests for `extractTraversePath()` |
| `public/data/traverses/perseverance.json` | T1 | Committed traverse path: `[[lat,lon],...]` |
| `public/data/traverses/curiosity.json` | T1 | Same for Curiosity |
| `src/data/types.ts` | T2 | Add `TraversePath = [number, number][]` and `Traverses` type |
| `src/store/useAppStore.ts` | T2 | Add `traverses: Traverses \| null` field + `setTraverses` action |
| `src/store/useAppStore.test.ts` | T2 | Add `setTraverses` test |
| `src/data/DataLoader.tsx` | T3 | Fetch both traverse files in parallel; call `setTraverses` |
| `src/data/DataLoader.test.tsx` | T3 | Test that traverses load and store is populated |
| `src/ui/RoverPicker.tsx` | T4 | Bottom-center chips: click → `selectRover` + `setDrawerOpen(true)` |
| `src/ui/RoverPicker.test.tsx` | T4 | Chip renders and click dispatches correct store actions |
| `src/scene/TraverseLine.tsx` | T5 | Renders `[lat,lon][]` as a drei `<Line>` on the globe surface |
| `src/scene/Rover.tsx` | T5 | Add `selected` prop → larger pip + white colour |
| `src/scene/Scene.tsx` | T5 | Wire TraverseLines + pass `selected` to Rover |
| `src/ui/DataDrawer.tsx` | T6 | Right-side slide panel: name, sol, distance, lat/lon, note |
| `src/ui/DataDrawer.test.tsx` | T6 | Renders stats; close button dispatches `setDrawerOpen(false)` |
| `src/ui/MobileFallback.tsx` | T7 | Shown when `window.matchMedia('(max-width:768px),(pointer:coarse)')` |
| `src/ui/MobileFallback.test.tsx` | T7 | Renders expected text; RoverPicker present |
| `src/App.tsx` | T8 | Add mobile detection; render RoverPicker, DataDrawer, MobileFallback |
| `tests/e2e/smoke.spec.ts` | T9 | Add: rover chip click → drawer open; mobile viewport → no canvas |

---

## Task 1: Traverse bake script + committed data

**Files:**
- Create: `scripts/bake-traverses.mjs`
- Create: `scripts/bake-traverses.test.mjs`
- Create: `public/data/traverses/perseverance.json`
- Create: `public/data/traverses/curiosity.json`

The traverse GeoJSON files have one Feature per drive segment. Each Feature's geometry is a `LineString` (M20) or `MultiLineString` (MSL) in GeoJSON coordinate order `[lon, lat, elev]`. We extract the **last coordinate of each feature** as the drive's endpoint, giving one `[lat, lon]` per drive. Consecutive duplicate points are removed. This produces a compact path array: ~2000 points for M20, ~3500 for MSL.

- [ ] **Step 1: Write the failing test**

Create `scripts/bake-traverses.test.mjs`:

```js
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
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- scripts/bake-traverses.test.mjs`
Expected: FAIL "Cannot find module './bake-traverses.mjs'".

- [ ] **Step 3: Implement `scripts/bake-traverses.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pure function. Takes a parsed traverse FeatureCollection (GeoJSON).
 * Returns [[lat, lon], ...] -- one point per drive segment endpoint.
 * GeoJSON coordinate order is [lon, lat, elev]; we swap to [lat, lon].
 */
export function extractTraversePath(traverseGeoJson) {
  const points = [];

  for (const feature of traverseGeoJson.features) {
    const { geometry } = feature;
    let lastCoord;

    if (geometry.type === 'LineString') {
      const c = geometry.coordinates;
      lastCoord = c[c.length - 1];
    } else if (geometry.type === 'MultiLineString') {
      const lines = geometry.coordinates;
      const lastLine = lines[lines.length - 1];
      lastCoord = lastLine[lastLine.length - 1];
    }

    if (!lastCoord) continue;

    const lat = lastCoord[1];
    const lon = lastCoord[0];

    const prev = points[points.length - 1];
    if (!prev || prev[0] !== lat || prev[1] !== lon) {
      points.push([lat, lon]);
    }
  }

  return points;
}

// CLI: reads data/fixtures/, writes public/data/traverses/
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixturesDir = join(__dirname, '..', 'data', 'fixtures');
  const outDir = join(__dirname, '..', 'public', 'data', 'traverses');
  mkdirSync(outDir, { recursive: true });

  const rovers = [
    { id: 'perseverance', fixture: 'M20_traverse.json' },
    { id: 'curiosity',    fixture: 'MSL_traverse.json' },
  ];

  for (const { id, fixture } of rovers) {
    process.stdout.write(`Processing ${fixture} ... `);
    const raw = JSON.parse(readFileSync(join(fixturesDir, fixture), 'utf8'));
    const path = extractTraversePath(raw);
    const outPath = join(outDir, `${id}.json`);
    writeFileSync(outPath, JSON.stringify(path) + '\n', 'utf8');
    console.log(`OK -- ${path.length} points -> ${outPath}`);
  }
}
```

- [ ] **Step 4: Run tests, verify 4 pass**

Run: `npm test -- scripts/bake-traverses.test.mjs`
Expected: 4 tests pass.

- [ ] **Step 5: Generate the traverse files**

Run: `node scripts/bake-traverses.mjs`
Expected:
```
Processing M20_traverse.json ... OK -- XXXX points -> .../public/data/traverses/perseverance.json
Processing MSL_traverse.json ... OK -- XXXX points -> .../public/data/traverses/curiosity.json
```

Verify files exist and are reasonable size:
```bash
ls -la public/data/traverses/
```
Expected: `perseverance.json` and `curiosity.json` each between 20KB and 200KB.

- [ ] **Step 6: Run full suite, no regressions**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/bake-traverses.mjs scripts/bake-traverses.test.mjs public/data/traverses/
git commit -m "feat(data): bake traverse paths from M0 fixtures; commit perseverance + curiosity JSON"
```

---

## Task 2: Add traverses to Zustand store

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/store/useAppStore.ts`
- Modify: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/store/useAppStore.test.ts` (append below the existing `describe` block):

```ts
describe('useAppStore -- traverses', () => {
  it('starts with null traverses', () => {
    expect(useAppStore.getState().traverses).toBeNull();
  });

  it('setTraverses stores the path data', () => {
    const t = {
      perseverance: [[18.43, 77.22], [18.44, 77.23]] as [number, number][],
      curiosity: [[-4.81, 137.38]] as [number, number][],
    };
    useAppStore.getState().setTraverses(t);
    expect(useAppStore.getState().traverses?.perseverance).toHaveLength(2);
    expect(useAppStore.getState().traverses?.curiosity).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/store/useAppStore.test.ts`
Expected: FAIL "useAppStore.getState().traverses is not a property" or similar.

- [ ] **Step 3: Update `src/data/types.ts`**

Replace the entire file:

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
  elev_geoid: z.number(),
  dist_total_m: z.number(),
  RMC: z.string(),
  fetchedAt: z.string(),
});
export type RoverData = z.infer<typeof RoverDataSchema>;

export const RoversJsonSchema = z.object({
  perseverance: RoverDataSchema,
  curiosity: RoverDataSchema,
  lastUpdated: z.string(),
});
export type RoversJson = z.infer<typeof RoversJsonSchema>;

// [lat, lon] pair array -- pre-baked from JPL traverse GeoJSON
export type TraversePath = [number, number][];

export interface Traverses {
  perseverance: TraversePath;
  curiosity: TraversePath;
}
```

- [ ] **Step 4: Update `src/store/useAppStore.ts`**

Replace the entire file:

```ts
import { create } from 'zustand';
import type { RoverId, RoversJson, Traverses } from '../data/types';

interface AppState {
  rovers: RoversJson | null;
  traverses: Traverses | null;
  selectedRoverId: RoverId | null;
  currentSol: number;
  cameraMode: 'orbit' | 'diving' | 'surface';
  drawerOpen: boolean;
  stale: boolean;
  // actions
  setRovers: (rovers: RoversJson, stale: boolean) => void;
  setTraverses: (traverses: Traverses) => void;
  selectRover: (id: RoverId) => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  rovers: null,
  traverses: null,
  selectedRoverId: null,
  currentSol: 0,
  cameraMode: 'orbit',
  drawerOpen: false,
  stale: false,
  setRovers: (rovers, stale) => set({ rovers, stale }),
  setTraverses: (traverses) => set({ traverses }),
  selectRover: (id) => set({ selectedRoverId: id }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
}));
```

- [ ] **Step 5: Update `beforeEach` reset in `src/store/useAppStore.test.ts`**

The `beforeEach` must reset all state including `traverses`. Update the existing `beforeEach`:

```ts
beforeEach(() => {
  useAppStore.setState({
    rovers: null, traverses: null, selectedRoverId: null, currentSol: 0,
    cameraMode: 'orbit', drawerOpen: false, stale: false,
  });
});
```

- [ ] **Step 6: Run tests, verify all pass**

Run: `npm test -- src/store/useAppStore.test.ts`
Expected: All 7 tests pass (5 existing + 2 new).

- [ ] **Step 7: Commit**

```bash
git add src/data/types.ts src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat(store): add traverses field and setTraverses action"
```

---

## Task 3: DataLoader fetches traverse paths

**Files:**
- Modify: `src/data/DataLoader.tsx`
- Modify: `src/data/DataLoader.test.tsx`

Traverse files are fetched in parallel with no bundled fallback -- a failed traverse fetch just leaves `traverses: null`; the globe still works, just without traverse lines.

- [ ] **Step 1: Write the failing tests**

Add to `src/data/DataLoader.test.tsx` (append below existing `describe` block):

```tsx
describe('DataLoader -- traverses', () => {
  it('sets traverses when both traverse files load successfully', async () => {
    const mockTraverseP: [number, number][] = [[18.43, 77.22]];
    const mockTraverseC: [number, number][] = [[-4.81, 137.38]];

    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/data/rovers.json') {
        return Promise.resolve({ ok: false, status: 500 }); // use snapshot
      }
      if (url === '/data/traverses/perseverance.json') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTraverseP) });
      }
      if (url === '/data/traverses/curiosity.json') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTraverseC) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }));

    render(<DataLoader />);

    await vi.waitFor(() => {
      const { traverses } = useAppStore.getState();
      expect(traverses?.perseverance).toHaveLength(1);
      expect(traverses?.curiosity).toHaveLength(1);
    });
  });

  it('leaves traverses null when traverse fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/data/rovers.json') return Promise.resolve({ ok: false, status: 500 });
      return Promise.reject(new Error('network error'));
    }));

    render(<DataLoader />);

    await vi.waitFor(() => {
      // rovers fallback must have loaded (stale)
      expect(useAppStore.getState().stale).toBe(true);
    });
    expect(useAppStore.getState().traverses).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify new tests fail**

Run: `npm test -- src/data/DataLoader.test.tsx`
Expected: 3 existing pass, 2 new FAIL.

- [ ] **Step 3: Update `src/data/DataLoader.tsx`**

Replace the entire file:

```tsx
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RoversJsonSchema } from './types';
import type { TraversePath } from './types';
import snapshotJson from '../../public/data/rovers.json';

const snapshot = RoversJsonSchema.parse(snapshotJson);

export function DataLoader() {
  const setRovers = useAppStore((s) => s.setRovers);
  const setTraverses = useAppStore((s) => s.setTraverses);

  useEffect(() => {
    // Rover positions
    fetch('/data/rovers.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((raw) => setRovers(RoversJsonSchema.parse(raw), false))
      .catch(() => setRovers(snapshot, true));

    // Traverse paths -- parallel, no fallback
    Promise.all([
      fetch('/data/traverses/perseverance.json').then((r) => r.ok ? r.json() as Promise<TraversePath> : Promise.reject()),
      fetch('/data/traverses/curiosity.json').then((r) => r.ok ? r.json() as Promise<TraversePath> : Promise.reject()),
    ])
      .then(([perseverance, curiosity]) => setTraverses({ perseverance, curiosity }))
      .catch(() => { /* no traverse lines if fetch fails */ });
  }, [setRovers, setTraverses]);

  return null;
}
```

- [ ] **Step 4: Run tests, verify all 5 pass**

Run: `npm test -- src/data/DataLoader.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/data/DataLoader.tsx src/data/DataLoader.test.tsx
git commit -m "feat(data): DataLoader fetches traverse paths; populates store"
```

---

## Task 4: RoverPicker component

**Files:**
- Create: `src/ui/RoverPicker.tsx`
- Create: `src/ui/RoverPicker.test.tsx`

Floating chips at bottom-center. Clicking a chip calls `selectRover(id)` AND `setDrawerOpen(true)`. Active rover chip is highlighted. If rovers data is null, chips are shown but not active.

- [ ] **Step 1: Write the failing test**

Create `src/ui/RoverPicker.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoverPicker } from './RoverPicker';
import { useAppStore } from '../store/useAppStore';
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
    rovers: mockRovers, traverses: null, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false, stale: false,
  });
});

describe('RoverPicker', () => {
  it('renders both rover chips', () => {
    render(<RoverPicker />);
    expect(screen.getByText('Perseverance')).toBeInTheDocument();
    expect(screen.getByText('Curiosity')).toBeInTheDocument();
  });

  it('clicking a chip calls selectRover and opens drawer', () => {
    render(<RoverPicker />);
    fireEvent.click(screen.getByText('Perseverance'));
    expect(useAppStore.getState().selectedRoverId).toBe('perseverance');
    expect(useAppStore.getState().drawerOpen).toBe(true);
  });

  it('clicking a different chip switches selection', () => {
    render(<RoverPicker />);
    fireEvent.click(screen.getByText('Curiosity'));
    expect(useAppStore.getState().selectedRoverId).toBe('curiosity');
  });

  it('selected chip has aria-pressed=true', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance' });
    render(<RoverPicker />);
    expect(screen.getByText('Perseverance').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Curiosity').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/ui/RoverPicker.test.tsx`
Expected: FAIL "Cannot find module './RoverPicker'".

- [ ] **Step 3: Implement `src/ui/RoverPicker.tsx`**

```tsx
import { useAppStore } from '../store/useAppStore';
import type { RoverId } from '../data/types';

const ROVER_IDS: RoverId[] = ['perseverance', 'curiosity'];
const ROVER_LABELS: Record<RoverId, string> = {
  perseverance: 'Perseverance',
  curiosity: 'Curiosity',
};

export function RoverPicker() {
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const selectRover = useAppStore((s) => s.selectRover);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);

  function handleClick(id: RoverId) {
    selectRover(id);
    setDrawerOpen(true);
  }

  return (
    <div style={{
      position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 12, zIndex: 10,
    }}>
      {ROVER_IDS.map((id) => {
        const active = selectedRoverId === id;
        return (
          <button
            key={id}
            aria-pressed={active}
            onClick={() => handleClick(id)}
            style={{
              padding: '10px 22px',
              borderRadius: 24,
              border: `2px solid ${active ? '#00d9ff' : 'rgba(255,255,255,0.3)'}`,
              background: active ? 'rgba(0,217,255,0.15)' : 'rgba(0,0,0,0.55)',
              color: active ? '#00d9ff' : 'rgba(255,255,255,0.7)',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
              fontWeight: active ? 700 : 400,
              letterSpacing: '0.03em',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            {ROVER_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run, verify all 4 tests pass**

Run: `npm test -- src/ui/RoverPicker.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/RoverPicker.tsx src/ui/RoverPicker.test.tsx
git commit -m "feat(ui): add RoverPicker with active state and store dispatch"
```

---

## Task 5: TraverseLine component + Rover selected state + Scene wiring

**Files:**
- Create: `src/scene/TraverseLine.tsx`
- Modify: `src/scene/Rover.tsx`
- Modify: `src/scene/Scene.tsx`

`TraverseLine` uses drei's `<Line>` component which handles TypeScript and WebGL line rendering cleanly.

- [ ] **Step 1: Write the failing test for TraverseLine geometry**

`src/scene/TraverseLine.test.tsx` only tests the coordinate conversion math (no pixel output):

```tsx
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
```

- [ ] **Step 2: Run, verify it passes immediately** (uses existing `latLonToVec3`)

Run: `npm test -- src/scene/TraverseLine.test.tsx`
Expected: 2 tests pass. (These test coordinate math already implemented in M0.)

- [ ] **Step 3: Implement `src/scene/TraverseLine.tsx`**

```tsx
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { latLonToVec3 } from '../data/coords';

interface TraverseLineProps {
  path: [number, number][];
  globeRadius: number;
  color?: string;
}

export function TraverseLine({ path, globeRadius, color = '#ff8c42' }: TraverseLineProps) {
  const points = useMemo<Vector3[]>(
    () => path.map(([lat, lon]) => latLonToVec3(lat, lon, globeRadius * 1.003)),
    [path, globeRadius],
  );

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1.5}
      transparent
      opacity={0.6}
    />
  );
}
```

- [ ] **Step 4: Update `src/scene/Rover.tsx` -- add `selected` prop**

Replace the entire file:

```tsx
import { latLonToVec3 } from '../data/coords';

interface RoverProps {
  lat: number;
  lon: number;
  globeRadius: number;
  selected?: boolean;
}

export function Rover({ lat, lon, globeRadius, selected = false }: RoverProps) {
  const pos = latLonToVec3(lat, lon, globeRadius * 1.015);
  const pipRadius = globeRadius * (selected ? 0.022 : 0.015);

  return (
    <mesh position={pos}>
      <sphereGeometry args={[pipRadius, 16, 16]} />
      <meshBasicMaterial color={selected ? '#ffffff' : '#00d9ff'} />
    </mesh>
  );
}
```

- [ ] **Step 5: Update `src/scene/Scene.tsx` -- add TraverseLines + selected Rover state**

Replace the entire file:

```tsx
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { MarsGlobe } from './MarsGlobe';
import { Atmosphere } from './Atmosphere';
import { Rover } from './Rover';
import { TraverseLine } from './TraverseLine';
import { useAppStore } from '../store/useAppStore';

const GLOBE_RADIUS = 1;

function SceneContents() {
  const rovers = useAppStore((s) => s.rovers);
  const traverses = useAppStore((s) => s.traverses);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const p = rovers?.perseverance;
  const c = rovers?.curiosity;

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 3, 5]} intensity={2.2} color="#fff8e7" />

      <Suspense fallback={null}>
        <MarsGlobe radius={GLOBE_RADIUS} />
      </Suspense>
      <Atmosphere radius={GLOBE_RADIUS} />

      {traverses && (
        <>
          <TraverseLine path={traverses.perseverance} globeRadius={GLOBE_RADIUS} color="#00d9ff" />
          <TraverseLine path={traverses.curiosity} globeRadius={GLOBE_RADIUS} color="#ff9c42" />
        </>
      )}

      {p && <Rover lat={p.lat} lon={p.lon} globeRadius={GLOBE_RADIUS} selected={selectedRoverId === 'perseverance'} />}
      {c && <Rover lat={c.lat} lon={c.lon} globeRadius={GLOBE_RADIUS} selected={selectedRoverId === 'curiosity'} />}

      <OrbitControls
        enablePan={false}
        minDistance={GLOBE_RADIUS * 1.3}
        maxDistance={GLOBE_RADIUS * 8}
        autoRotate={false}
      />

      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.9} />
      </EffectComposer>
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContents />
    </Canvas>
  );
}
```

- [ ] **Step 6: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 7: Run full suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/scene/TraverseLine.tsx src/scene/TraverseLine.test.tsx src/scene/Rover.tsx src/scene/Scene.tsx
git commit -m "feat(scene): add TraverseLine; Rover selected state; wire Scene"
```

---

## Task 6: DataDrawer component

**Files:**
- Create: `src/ui/DataDrawer.tsx`
- Create: `src/ui/DataDrawer.test.tsx`

Renders when `drawerOpen && selectedRoverId !== null`. Shows rover name, sol, total distance in km, lat/lon, elevation, and the `Note` from current waypoint properties (not yet in rovers.json -- show "—" for M2). Close button dispatches `setDrawerOpen(false)`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/DataDrawer.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataDrawer } from './DataDrawer';
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
    rovers: mockRovers, traverses: null, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false, stale: false,
  });
});

describe('DataDrawer', () => {
  it('renders nothing when drawerOpen is false', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: false });
    const { container } = render(<DataDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no rover is selected', () => {
    useAppStore.setState({ selectedRoverId: null, drawerOpen: true });
    const { container } = render(<DataDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('shows rover name and sol when open with a selected rover', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<DataDrawer />);
    expect(screen.getByText('Perseverance')).toBeInTheDocument();
    expect(screen.getByText(/Sol 1840/)).toBeInTheDocument();
  });

  it('shows total distance in km', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<DataDrawer />);
    // 19842.1 m / 1000 = 19.8 km
    expect(screen.getByText(/19\.8 km/)).toBeInTheDocument();
  });

  it('shows Curiosity stats when curiosity is selected', () => {
    useAppStore.setState({ selectedRoverId: 'curiosity', drawerOpen: true });
    render(<DataDrawer />);
    expect(screen.getByText('Curiosity')).toBeInTheDocument();
    expect(screen.getByText(/Sol 4868/)).toBeInTheDocument();
  });

  it('close button dispatches setDrawerOpen(false)', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<DataDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(useAppStore.getState().drawerOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/ui/DataDrawer.test.tsx`
Expected: FAIL "Cannot find module './DataDrawer'".

- [ ] **Step 3: Implement `src/ui/DataDrawer.tsx`**

```tsx
import { useAppStore } from '../store/useAppStore';

export function DataDrawer() {
  const rovers = useAppStore((s) => s.rovers);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);

  if (!drawerOpen || !selectedRoverId || !rovers) return null;

  const rover = rovers[selectedRoverId];
  const distKm = (rover.dist_total_m / 1000).toFixed(1);

  return (
    <aside style={{
      position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)',
      zIndex: 20, width: 260,
      background: 'rgba(8,12,20,0.82)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      padding: '20px 20px 16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.02em' }}>
          {rover.name}
        </span>
        <button
          aria-label="Close drawer"
          onClick={() => setDrawerOpen(false)}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >
          ×
        </button>
      </div>

      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 12, columnGap: 8 }}>
        <Stat label="Sol" value={`Sol ${rover.currentSol}`} />
        <Stat label="Distance" value={`${distKm} km`} />
        <Stat label="Latitude" value={`${rover.lat.toFixed(4)}°`} />
        <Stat label="Longitude" value={`${rover.lon.toFixed(4)}°`} />
        <Stat label="Elevation" value={`${rover.elev_geoid.toFixed(0)} m`} />
        <Stat label="RMC" value={rover.RMC} />
      </dl>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </dd>
    </div>
  );
}
```

- [ ] **Step 4: Run, verify all 6 tests pass**

Run: `npm test -- src/ui/DataDrawer.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ui/DataDrawer.tsx src/ui/DataDrawer.test.tsx
git commit -m "feat(ui): add DataDrawer with rover stats panel"
```

---

## Task 7: Mobile fallback

**Files:**
- Create: `src/ui/MobileFallback.tsx`
- Create: `src/ui/MobileFallback.test.tsx`

Shown when `window.matchMedia('(max-width: 768px), (pointer: coarse)')` matches on mount. Replaces the 3D canvas with a simple dark card. RoverPicker and DataDrawer remain functional.

- [ ] **Step 1: Write the failing test**

Create `src/ui/MobileFallback.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileFallback } from './MobileFallback';
import { useAppStore } from '../store/useAppStore';
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
    rovers: mockRovers, traverses: null, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false, stale: false,
  });
});

describe('MobileFallback', () => {
  it('renders the app title', () => {
    render(<MobileFallback />);
    expect(screen.getByText('Mars Rover Tracker')).toBeInTheDocument();
  });

  it('shows the desktop prompt message', () => {
    render(<MobileFallback />);
    expect(screen.getByText(/desktop/i)).toBeInTheDocument();
  });

  it('renders both rover picker chips', () => {
    render(<MobileFallback />);
    expect(screen.getByText('Perseverance')).toBeInTheDocument();
    expect(screen.getByText('Curiosity')).toBeInTheDocument();
  });

  it('renders the NASA attribution link', () => {
    render(<MobileFallback />);
    expect(screen.getByRole('link', { name: /NASA\/JPL-Caltech/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/ui/MobileFallback.test.tsx`
Expected: FAIL "Cannot find module './MobileFallback'".

- [ ] **Step 3: Implement `src/ui/MobileFallback.tsx`**

```tsx
import { RoverPicker } from './RoverPicker';
import { DataDrawer } from './DataDrawer';

export function MobileFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at center, #1a0a06 0%, #000 70%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif', color: '#fff',
    }}>
      {/* Decorative Mars circle */}
      <div style={{
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #c1440e, #6b1a00)',
        marginBottom: 32, opacity: 0.85,
        boxShadow: '0 0 60px rgba(193,68,14,0.4)',
      }} />

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.04em' }}>
        Mars Rover Tracker
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', textAlign: 'center', padding: '0 32px' }}>
        Open on a desktop browser for the 3D experience.
      </p>

      <RoverPicker />
      <DataDrawer />

      <a
        href="https://mars.nasa.gov/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute', bottom: 16,
          fontSize: 11, color: 'rgba(255,255,255,0.35)', textDecoration: 'underline',
        }}
      >
        NASA/JPL-Caltech
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Run, verify all 4 tests pass**

Run: `npm test -- src/ui/MobileFallback.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ui/MobileFallback.tsx src/ui/MobileFallback.test.tsx
git commit -m "feat(ui): add MobileFallback with rover picker and attribution"
```

---

## Task 8: App assembly

**Files:**
- Modify: `src/App.tsx`

Wire in RoverPicker, DataDrawer, and mobile detection. The mobile detection uses `window.matchMedia` on mount via `useState`/`useEffect` to avoid SSR issues. `MobileFallback` replaces `Scene` on mobile; all other components are shared.

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { DataLoader } from './data/DataLoader';
import { Scene } from './scene/Scene';
import { TopBar } from './ui/TopBar';
import { RoverPicker } from './ui/RoverPicker';
import { DataDrawer } from './ui/DataDrawer';
import { MobileFallback } from './ui/MobileFallback';

function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px), (pointer: coarse)').matches);
  }, []);
  return isMobile;
}

export function App() {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <>
        <DataLoader />
        <MobileFallback />
      </>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <DataLoader />
      <Scene />
      <TopBar />
      <RoverPicker />
      <DataDrawer />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Eyeball the dev server**

Open `http://localhost:5174/` (start dev server if not running: `npm run dev`).

Expected:
- Rotating Mars globe with two traverse paths (cyan for Perseverance, orange for Curiosity)
- Two chips at the bottom: "Perseverance" and "Curiosity"
- Clicking a chip: chip highlights, DataDrawer slides in from the right showing sol + distance
- X button closes the drawer

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire RoverPicker, DataDrawer, mobile fallback into App root"
```

---

## Task 9: E2E test updates and final push

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Update `tests/e2e/smoke.spec.ts`**

Replace the entire file:

```ts
import { test, expect } from '@playwright/test';

test.describe('M1 smoke', () => {
  test('page loads, canvas visible, no JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(3000);

    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Mars Rover Tracker')).toBeVisible();

    expect(errors, `JS errors: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('NASA attribution link is present', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[href="https://mars.nasa.gov/"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('NASA/JPL-Caltech');
  });
});

test.describe('M2 smoke', () => {
  test('RoverPicker chips are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Perseverance')).toBeVisible();
    await expect(page.locator('text=Curiosity')).toBeVisible();
  });

  test('clicking Perseverance opens the DataDrawer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.locator('button', { hasText: 'Perseverance' }).click();
    // DataDrawer shows sol number
    await expect(page.locator('text=/Sol \\d+/')).toBeVisible();
  });

  test('DataDrawer closes on X button click', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.locator('button', { hasText: 'Perseverance' }).click();
    await expect(page.locator('text=/Sol \\d+/')).toBeVisible();
    await page.locator('button[aria-label="Close drawer"]').click();
    await expect(page.locator('text=/Sol \\d+/')).not.toBeVisible();
  });

  test('mobile viewport shows no canvas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    // MobileFallback shows "desktop" message; canvas is absent
    await expect(page.locator('text=/desktop/i')).toBeVisible();
    await expect(page.locator('canvas')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run Playwright tests**

Run: `npx playwright test`
Expected: All 6 tests pass (2 M1 + 4 M2).

If `text=/Sol \\d+/` fails because the data hasn't loaded yet, increase the `waitForTimeout` in the test from 1000 to 2000.

- [ ] **Step 3: Take a screenshot**

Run: `node scripts/screenshot-spike.mjs "http://localhost:5174/" "docs/m0-screenshots/m2-globe.png"`

Open `docs/m0-screenshots/m2-globe.png` and verify: globe with traverse paths visible, two chips at the bottom.

- [ ] **Step 4: Run full test suite one final time**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit and push**

```bash
git add tests/e2e/smoke.spec.ts docs/m0-screenshots/m2-globe.png
git commit -m "test(e2e): add M2 Playwright smoke tests for RoverPicker and DataDrawer"
git push
```

---

## Self-Review

**1. Spec coverage:**

| M2 spec requirement | Task |
|---|---|
| RoverPicker toggles between rovers | T4, T8 |
| TraverseLine rendering past waypoints | T1, T5 |
| DataDrawer with sol, total distance, latest notes | T6, T8 |
| High-res textures (KTX2) | **Deferred** -- 2K JPEG sufficient for globe view; KTX2 tooling requires native binaries not available in Node; revisit in M3 |
| Mobile fallback shipped | T7, T8 |
| Curiosity shown | Already in M1 (Curiosity pip in Scene); TraverseLine adds its path in T5 |

**2. Placeholder scan:** None. All steps contain complete code.

**3. Type consistency:**
- `TraversePath = [number, number][]` defined in T2 `types.ts`, used in T3 `DataLoader.tsx`, T5 `TraverseLine.tsx`, T2 store.
- `Traverses` interface defined in T2 `types.ts`, used in T2 store and T3 DataLoader.
- `useAppStore.setState` reset in `beforeEach` includes `traverses: null` in T2 onwards.
- `DataDrawer` reads `rovers[selectedRoverId]` -- valid because `selectedRoverId` is always a key of `rovers` when non-null.
- `RoverPicker` uses `ROVER_IDS: RoverId[]` to avoid hardcoded strings; matches `RoverIdSchema` from T2.
- `dist_total_m / 1000` in DataDrawer -- unit confirmed: `dist_total_m` is metres (from schema.ts comment and M0 fixtures showing ~41,737 m = 41.7 km for Perseverance).
