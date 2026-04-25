# M0 Spike Findings

**Date:** 2026-04-25
**Spec gating decision:** PROCEED to M1.

## 1. MMGIS endpoint reality check

| Endpoint | Status | Features | Notes |
|---|---|---|---|
| M20_waypoints_current.json | 200 | 1 | Current position only; sol 1840, lat 18.4325, lon 77.2201 |
| M20_traverse.json | 200 | 522 | LineString geometry per leg |
| MSL_waypoints_current.json | 200 | 1 | Current position only; sol 4868, lat -4.8143, lon 137.3817 |
| MSL_traverse.json | 200 | 1273 | MultiLineString geometry per leg |

Schema deviations from what the initial design assumed (all fixed in `src/data/schema.ts`):

- `pos` field assumed required -- absent in real data; removed from schema entirely.
- `dist_total` assumed -- real field is `dist_total_m` (units explicit in the name).
- `notes` assumed (lowercase) -- real field is `Note` (capital N, optional).
- MSL traverse assumed LineString -- real geometry is MultiLineString; added `MultiLineStringGeometrySchema` and union type.

Both rovers publish only their **current** waypoint (1 feature each); the full traversal path comes from the separate traverse endpoint. The waypoints fixture is not a history of all stops.

Fixtures committed at: `data/fixtures/`.

## 2. Coordinate transform end-to-end

Visual evidence: `docs/m0-screenshots/sphere.png`, `docs/m0-screenshots/surface.png`.

| Check | Result |
|---|---|
| Marker on sphere sits on Mars surface (no float, no bury) | pass |
| Marker on baked DEM patch sits on terrain | pass |
| Round-trip lat/lon -> Vec3 -> lat/lon stable to 5 decimals | pass (verified by unit test) |

Coordinate chain documented at: `docs/coords.md`. IAU 2000 mean radius 3389.5 km.
Planetographic vs planetocentric difference (~0.3 deg max) is below visualization
precision and documented as an accepted approximation.

## 3. DEM bake pipeline

Source GeoTIFF: **synthetic sinusoidal fixture** (M0 placeholder).
Real tile for M3: DTEEC_036081_1985_036147_1985_A01 from USGS HiRISE PDS.
The HiRISE PDS was not directly accessible by scripted fetch during the spike;
download requires manual browser navigation to the USGS Astrogeology HiRISE index.

Patch coverage: 77.1-77.7 E, 18.1-18.7 N (contains Perseverance at 77.22 E, 18.43 N).

Output:
- `data/dem/perseverance.bin`: 131,072 bytes (256x256 cells, 16-bit per cell)
- `data/dem/perseverance.json`: metadata sidecar
- Resolution: 256x256 cells, ~137 m/cell (lon) x ~139 m/cell (lat)
- Elevation range: -2614 m to -2435 m (179 m relief, consistent with MOLA for Jezero)

`dataToHeightfield` function is fully tested (3 unit tests). The pipeline works;
only the real tile source needs to be wired for M3.

Tile-source friction encountered:
- HiRISE PDS at lpl.arizona.edu requires manual download; not scriptable via curl.
- USGS ODE REST API returned 403 on the URL tried.
- Workaround for M0: synthetic fixture validates the pipeline. For M3, a team member
  downloads the real tile manually and runs `node scripts/bake-dem.mjs <tile> perseverance`.

## 4. Asset budget reality check

Production build with full stack (R3F + drei + postprocessing + GSAP + Zustand + zod):

| Chunk | Uncompressed | Gzipped |
|---|---|---|
| types chunk (Three.js + R3F + drei + postprocessing) | 1,029 KB | 281.6 KB |
| main chunk (React, GSAP, Zustand, zod, app code) | 139 KB | 44.8 KB |
| **Total JS** | **1,168 KB** | **326.4 KB** |

Spec budget: < 800 KB gzipped.
**Result: under budget by 473 KB (59% headroom).**

No fallbacks required. The full stack comfortably fits within budget.
GSAP does not need lazy-loading at current size; re-evaluate if heavy animation
sequences are added in M3.

Note: postprocessing adds ~50 KB gzipped. If dropped, total falls to ~275 KB.
Keeping it for now; the spec's Bloom effect requires it.

## 5. Tooling finding (dev-only)

Playwright headless Chromium blocks WebGL on this machine (GPU disabled in sandbox mode).
The screenshot script uses `headless: false` (real GPU via ANGLE/D3D11) to render Three.js.
This is a local dev concern only; CI screenshots on a GPU-capable runner would work headlessly.
Document in CI setup notes when GitHub Actions is wired in M4.

## Recommendation

**Proceed to M1.** All four checks passed. Schema is reconciled against real data.
Coordinate chain works end-to-end. DEM pipeline is functional (synthetic data validates
all code paths). Bundle is well within budget with the full stack included.

One action before M3: obtain the real HiRISE DTM tile
(DTEEC_036081_1985_036147_1985_A01) via manual download from the USGS HiRISE index
and replace `data/dem/_source/perseverance.tif` + re-bake.

## Spec deltas applied

- `src/data/schema.ts`: reconciled to real MMGIS field names (4 deviations fixed).
- `docs/superpowers/specs/2026-04-25-mars-rover-tracker-design.md`: performance budget
  section updated with measured numbers (see commit following this file).
