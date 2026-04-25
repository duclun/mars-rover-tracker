# Mars Rover Tracker -- Design Spec

**Date:** 2026-04-25
**Status:** Draft, pending user review
**Owner:** alain.on@gmail.com

## Summary

A web app that tracks NASA's two active Mars rovers -- Perseverance and Curiosity -- in 3D, on real Martian terrain. Default experience is cinematic: the user sees Mars from orbit, picks a rover, and the camera dives down to surface level on that rover's actual landing site. A data drawer is available for users who want sol counts, traverse distance, and drive notes.

Static SPA, no backend. NASA data is pulled nightly by a GitHub Action and committed into the repo as JSON; the site is hosted on GitHub Pages. Total infrastructure cost: $0.

## Goals

- Show both active Mars rovers in their real, current locations.
- Render Mars with cinematic-hybrid art direction: real geometry (DEM-driven) with stylized lighting and color grading.
- Deliver a continuous orbit-to-surface camera dive as the signature interaction.
- Stay fresh: rover positions update within ~24 hours of NASA publishing them.
- Work offline-tolerantly: a stale-but-functional snapshot ships with every build.

## Non-Goals (v1)

- Real-time rover camera streams (the rovers don't downlink that way).
- Live telemetry beyond position (instrument readings, battery -- not in JPL's public feeds).
- User accounts, saved tours, or shareable URLs that pin a sol/camera state.
- Historic rovers (Sojourner, Spirit, Opportunity). Reserved for a stretch milestone.

## Mobile Posture (defined fallback)

Full cinematic experience targets desktop. Mobile is not a non-goal in the "404 you" sense -- a meaningful share of GitHub Pages traffic will be phones, and they should still get something good.

Mobile fallback (detected by viewport width and a touch + pointer-coarse media query):

- Static hero image of Mars (the orbit view, pre-rendered).
- `<RoverPicker>` and `<DataDrawer>` remain functional. Selecting a rover swaps the hero image to a still of that rover's landing site and populates the drawer with current sol, total distance, and recent drive notes.
- The dive animation is disabled. A small note explains "Open on a desktop browser for the cinematic 3D experience."
- `<SolScrubber>` remains functional in the drawer.

This means mobile gets a real product (current data, attribution, navigation) -- just not the 3D scene.

## Audience & Vibe

Hybrid hero+data: cinematic by default, optional data drawer for the curious. Public-facing, broadly accessible, but with substance for science-minded visitors.

## Data Sources

### Rover position telemetry -- JPL MMGIS waypoint feeds

JPL's Mars Multi-mission GIS publishes rover waypoint GeoJSON for both active rovers, refreshed shortly after each drive sol.

- Perseverance: `mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints_current.json` and `M20_traverse.json`
- Curiosity: `mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints_current.json` and `MSL_traverse.json`

Each waypoint feature carries: `sol`, `site`, `pos`, `lon`, `lat`, `elev_geoid`, `drive`, `dist_m`, `dist_total`, plus `notes` on some sols. Cadence: ~daily after drives.

This is the single biggest external dependency. The implementation must:

1. Verify URLs and shape at build time. The refresh script zod-validates the parsed payload; failures abort the commit.
2. Ship **last-known-good fixtures** committed in `data/fixtures/` (one for each of the four endpoints). These bootstrap the build, serve as the offline fallback, and are the canonical inputs for unit tests.
3. On schema drift, the GitHub Action opens an issue including (a) which endpoint failed, (b) the zod error, and (c) a unified diff between the last-known-good fixture and the current payload, so we can read what changed without curl-ing JPL ourselves.

### Global Mars basemap (orbit view)

- **MOLA elevation** -- global DEM at ~463 m/pixel, used as the displacement/normal map on the globe sphere.
- **Viking MDIM 2.1 color mosaic** or **CTX global mosaic** -- used as the albedo texture wrapped on the sphere.

Both are public domain. Pre-bake into KTX2-compressed equirectangular textures at build time.

### Surface DEM near each rover (cinematic surface view)

- **HiRISE DTMs** at 1 m/pixel from USGS Astrogeology Science Center. Coverage exists for both Jezero Crater (Perseverance) and Gale Crater (Curiosity).
- **HiRISE orthoimagery** at matching resolution, used as the surface texture.

Pre-bake a ~5 km radius patch around each landing site using `scripts/bake-dem.mjs`. Output is a compressed heightfield (~2 MB per rover) committed to the repo. **See Risks: HiRISE alignment** -- selecting tiles, reconciling projections, and aligning the rover's MMGIS lat/lon to a point on the baked DEM is the highest-uncertainty work in the project.

### Sol-keyed mission imagery (deferred)

NASA's Mars Photos API at `api.nasa.gov` returns rover camera images by sol. Not required for v1; reserved for a stretch milestone to populate the data drawer with "what the rover saw on this sol."

### Licensing & attribution

All sources above are public domain or released for non-commercial public use. Attribution required: NASA/JPL-Caltech/USGS, surfaced in `<CreditsFooter>`.

## Risks

The risky parts of this project are not the React/R3F/Zustand stack. They are data availability, asset prep, coordinate transforms, and browser performance. Each risk below has a stated mitigation; the M0 spike (next section) is the cross-cutting hedge.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| HiRISE DTM coordinate alignment is wrong (rover floats above/below terrain) | High | High | M0 spike: bake one tiny patch, place a marker at the rover's lat/lon, verify it sits on the surface. Document the projection + datum chain in `docs/coords.md`. |
| MMGIS feed URLs change or schema drifts | Medium | Medium | Last-known-good fixtures + zod validation + diff in the failure issue (see Data Sources). |
| HiRISE DTM tile we want isn't published or is too low quality at our radius | Medium | Medium | M0 spike confirms tile availability before committing to M3. Fallback: smaller radius patch, or procedurally extended skirts beyond the available DTM. |
| Bundle exceeds budget once R3F + drei + postprocessing + GSAP + loaders are linked | High | Low | Treat 800 KB as a target until measured. M0 spike includes a real bundle measurement. Fallback ladder: drop drei-postprocessing in favor of hand-rolled effects, lazy-load GSAP, code-split rover models. |
| Surface view fps below 30 on mid-tier laptops | Medium | Medium | Mesh decimation, lower DEM resolution at distance, fewer post-FX passes on detected low-end GPUs (`navigator.gpu` heuristics). |
| GitHub Action lacks permissions to open issues on schema drift | Low | Low | `permissions: { contents: write, issues: write }` at the workflow level. Document this in the workflow file's header. If the token still can't open issues, fall back to failing the workflow loudly so the red badge shows on the repo. |
| Mojibake / encoding regressions in canonical docs | Low | Low | Spec uses ASCII-safe characters throughout. Diagrams use `+ - |` ASCII art. |

## M0 -- Spike (precedes M1)

A short technical proof. Output is throwaway code in a `spike/` branch and a `docs/m0-findings.md` writeup. The spike is done when the four findings below are answered.

1. **MMGIS endpoint reality check.** Hit each of the four URLs. Save responses to `data/fixtures/`. Confirm they match the documented schema; if not, update the schema before any code is written.
2. **Coordinate transform end-to-end.** Take one Perseverance waypoint (lat/lon/elevation) and convert it to: (a) a 3D position on a Mars sphere of arbitrary radius, and (b) a 3D position on a flat Three.js terrain mesh built from a real HiRISE DTM tile. Render both with a debug marker. Confirm the marker sits on the surface in both views.
3. **DEM bake pipeline.** Pick one HiRISE DTM tile that overlaps Perseverance's landing site. Run it through a draft `bake-dem.mjs` -- GeoTIFF -> compressed heightfield + albedo. Render in Three.js. Note final byte sizes.
4. **Asset budget reality check.** Build a minimal R3F scene using the actual stack (R3F + drei + postprocessing + GSAP + Zustand). Measure gzipped bundle size. Update the perf budget in this spec with a measured number, not an estimate.

If any of these reveal a structural problem (e.g., HiRISE DTMs aren't available for our rover sites, or coordinate alignment can't be achieved within the spike), we pause and revise the design before M1.

## Architecture

```
+-----------------------------------------------------------------+
|  Browser (single-page app)                                      |
|                                                                 |
|   React shell                                                   |
|     - <Scene/>          the 3D canvas (R3F)                     |
|     - <Hud/>            overlays, drawer, sol counter           |
|     - <CameraDirector/> drives orbit -> surface flight          |
|                                                                 |
|   Three.js scene graph (via R3F)                                |
|     - <MarsGlobe/>      sphere + MOLA disp + albedo             |
|     - <SurfacePatch/>   HiRISE DEM mesh per rover               |
|     - <Rover/>          GLTF model + traverse line              |
|     - <Atmosphere/>     dusty halo shader                       |
|     - <Sun/> + post-processing (bloom, color grade)             |
|                                                                 |
|   Data layer (Zustand store)                                    |
|     - rovers.json (waypoints, traverse, sol)                    |
|     - selected rover, current sol, camera state                 |
+-----------------------------------------------------------------+
       ^                                  ^
       | static assets                    | /data/rovers.json
       |                                  |
+------+----------------------------------+----------------------+
|  GitHub Pages (static origin, CDN-fronted)                     |
+----------------------------------------------------------------+
       ^
       | deploys built dist/ on every push to main
       |
+------+----------------------------------------------------------+
|  GitHub Actions                                                 |
|   - build.yml      npm ci && npm run build && deploy            |
|   - refresh.yml    nightly: pull NASA GeoJSON, normalize,       |
|                    commit /data/rovers.json, trigger redeploy   |
|                    (permissions: contents: write, issues: write)|
+-----------------------------------------------------------------+
```

### Tech stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | React 18 + Vite + TypeScript | Fast dev loop, no SSR needed |
| 3D | Three.js + React Three Fiber + drei + postprocessing | Declarative, full shader control, mature ecosystem |
| State | Zustand | Lightweight, escapes React render cycle for camera state |
| Animation | GSAP | Multi-property timelines with phase-relative easing |
| Texture format | KTX2 / Basis | ~75% smaller than PNG, native GPU decode |
| DEM format | 16-bit raw heightfield (`.bin`) + JSON metadata | Smallest format with sufficient precision |
| Hosting | GitHub Pages | Free, integrates with the same repo |
| CI | GitHub Actions | Free for public repos, schedule + push triggers |

### What we explicitly chose against

- **Cesium (alone or alongside Three.js).** Excellent for Earth/planet GIS, but its art direction is "Google Earth" by default. Doesn't fit the cinematic-hybrid look. The two-engine handoff in a Cesium+Three.js variant produces visible discontinuity at the dive transition.
- **Next.js / SSR.** No SEO win for a 3D scene; Vite SPA ships faster.
- **Redux / Context.** Camera state changes 60 fps; both options re-render too aggressively.
- **react-spring for the dive.** Spring physics fight phase-relative cinematic timing.

## Components

### 3D scene

| Component | Responsibility | Inputs |
|---|---|---|
| `<Scene>` | Mounts canvas, lighting, camera, post-FX pipeline | -- |
| `<MarsGlobe>` | Renders the planet sphere with MOLA displacement + albedo | `radius`, `rotation` |
| `<SurfacePatch>` | Renders the local DEM mesh around a rover (lazy) | `roverId`, `centerLatLon` |
| `<Atmosphere>` | Dusty halo around the planet, sky tint on surface | `cameraAltitude` |
| `<Rover>` | The 3D rover GLTF model + landed/driving state | `roverId`, `position`, `heading` |
| `<TraverseLine>` | The line of past waypoints (curved tube on surface) | `waypoints[]` |
| `<WaypointMarker>` | Pip on the path with sol number; click to focus | `waypoint`, `selected` |

### Director / orchestration

| Component | Responsibility |
|---|---|
| `<CameraDirector>` | Owns the GSAP timeline. Translates state changes into a camera flight: orbit -> re-orient -> dive -> settle. Reads from Zustand; does not write during a tween. |
| `<DataLoader>` | On boot: fetch `/data/rovers.json`, fall back to bundled snapshot, expose to store. Re-fetch on visibility change. |
| `<DEMLoader>` | Lazy-loads HiRISE DEM patches when needed. Caches in IndexedDB. |

### UI overlay (HTML)

| Component | Responsibility |
|---|---|
| `<TopBar>` | App title, "Perseverance / Curiosity" toggle, last-refresh timestamp |
| `<RoverPicker>` | Floating chips for the two rovers; selecting one triggers camera flight |
| `<DataDrawer>` | Slide-in panel: current sol, total distance, recent drive notes, waypoint list. Closed by default. |
| `<SolScrubber>` | Bottom timeline: drag to scrub the rover's traverse from sol 0 -> today |
| `<CreditsFooter>` | NASA/JPL/USGS attribution |

### State store (single source of truth)

```ts
{
  rovers: { perseverance: RoverData, curiosity: RoverData }
  selectedRoverId: 'perseverance' | 'curiosity' | null
  currentSol: number
  cameraMode: 'orbit' | 'diving' | 'surface'
  drawerOpen: boolean
}
```

### File layout

```
src/
  scene/
    Scene.tsx
    MarsGlobe.tsx
    SurfacePatch.tsx
    Atmosphere.tsx
    Rover.tsx
    TraverseLine.tsx
    WaypointMarker.tsx
    shaders/
      atmosphere.frag
      terrainGrade.frag
  director/
    CameraDirector.tsx
    flightPaths.ts
  data/
    DataLoader.tsx
    DEMLoader.ts
    types.ts
  ui/
    TopBar.tsx
    RoverPicker.tsx
    DataDrawer.tsx
    SolScrubber.tsx
  store/
    useAppStore.ts
  App.tsx
  main.tsx

scripts/
  refresh-nasa.mjs
  bake-dem.mjs

data/
  rovers.json              (refreshed nightly)
  fixtures/                (last-known-good payloads, committed)
    M20_waypoints.json
    M20_traverse.json
    MSL_waypoints.json
    MSL_traverse.json
  dem/perseverance.bin
  dem/curiosity.bin

docs/
  coords.md                (M0 output: projection + datum chain)
  m0-findings.md           (M0 output: spike writeup)
  smoke-checklist.md

.github/workflows/
  build.yml
  refresh.yml
```

## Data Flow

### Boot to first paint

1. User hits the URL.
2. React mounts; `<DataLoader>` fires.
3. Request `/data/rovers.json`.
   - Success -> hydrate Zustand store.
   - Failure -> load bundled snapshot, set `stale: true`.
4. `<Scene>` mounts: `<MarsGlobe>` visible immediately at low-res (ships in bundle).
5. Background: KTX2 high-res textures stream in (LOD swap when ready); DEM patches preload for both rovers.
6. ~1.5s: intro tween rotates globe to face camera. `<RoverPicker>` fades in. App is interactive.

### User picks a rover

1. Click "Curiosity".
2. Store: `selectedRoverId = 'curiosity'`, `cameraMode = 'diving'`.
3. `<CameraDirector>` reads the change -> builds GSAP timeline.
4. `<SurfacePatch roverId='curiosity'>` mounts, requests DEM (cached on repeat visits).
5. Timeline plays (~5s).
6. On complete: `cameraMode = 'surface'`. Drawer remains closed by default.

### Nightly NASA refresh

```
GitHub Action (cron: 0 3 * * *)
  - scripts/refresh-nasa.mjs:
      - fetch M20_waypoints_current.json + M20_traverse.json
      - fetch MSL_waypoints_current.json + MSL_traverse.json
      - validate against zod schema
      - normalize all four into /data/rovers.json
  - git diff: changed?
      - no  -> exit clean (no-op nights are normal)
      - yes -> commit "refresh: YYYY-MM-DD" -> push
  - on schema drift:
      - do NOT commit
      - open issue with endpoint name, zod error, payload diff
        vs last-known-good fixture
  - push triggers build.yml -> site redeploys
```

### The cinematic dive (5-second timeline)

```
t=0.0   ORBIT       altitude 25,000 km, looking at planet center

  Phase 1 (1.0s) -- re-orient
    - camera longitude rotates so target rover is on the limb
    - subtle parallax drift toward the rover side of the planet

t=1.0   APPROACH

  Phase 2 (2.5s) -- descend
    - altitude eases 25,000 km -> 2 km (logarithmic)
    - FOV widens 35 deg -> 55 deg (rush-of-speed feel)
    - atmosphere shader intensity ramps 0 -> 0.6
    - <MarsGlobe> fades out, <SurfacePatch> fades in around t=3.0

t=3.5   ARRIVAL

  Phase 3 (1.5s) -- settle
    - camera levels with horizon
    - drifts to a 3/4 angle on the rover (not directly behind)
    - bloom + warm color grade ramp in

t=5.0   SURFACE     altitude 8m above ground, 12m from rover
```

Reverse flight (back to orbit) plays the timeline backwards in 3s with a cheaper ease.

### Sol scrubbing

Drag the scrubber -> `store.currentSol` updates -> `<Rover>` position interpolates between waypoints[N] and waypoints[N+1] -> `<TraverseLine>` reveals/hides up to `currentSol` -> drawer (if open) updates with that sol's notes. No camera movement.

## Error Handling

| Failure | Response |
|---|---|
| `/data/rovers.json` 404 / network error on load | Fall back to bundled snapshot; show "showing cached data from {date}" badge |
| NASA GeoJSON URL changes / malformed JSON | Refresh Action zod-validates; on failure exits non-zero, doesn't commit, opens issue with payload diff vs last-known-good fixture. Site keeps working on prior data. |
| HiRISE DEM file fails to load | Surface patch falls back to flat plane + "terrain unavailable" toast. Globe view unaffected. |
| WebGL context lost | R3F's `onContextLost` shows "Reload to restart" overlay. We don't try to re-init mid-flight. |
| Device can't run WebGL2 | Detect on boot. Show static hero image + text fallback with a link to NASA's live data. |
| Detected mobile / touch device | Engage Mobile Posture (see above): static hero, drawer + picker active, no dive. |
| GSAP tween interrupted by another click mid-dive | Director kills the in-flight timeline, snapshots current camera state, builds a fresh timeline from there. No snap-back. |
| Slow network -- large textures take 10+ seconds | Low-res Mars textures ship in the bundle and render immediately. App is interactive in <2s regardless. |
| User navigates away mid-dive | Timeline killed in `useEffect` cleanup. No memory leaks. |

**Principle:** the cinematic experience never blocks on the network. Anything network-dependent has a bundled fallback.

## Testing

### Unit (Vitest)

- `scripts/refresh-nasa.mjs`: given fixture GeoJSON inputs, produces expected `rovers.json` shape.
- `flightPaths.ts`: given camera state + target, produces a timeline with the right phases and durations.
- Zustand store reducers and selectors.
- Zod schemas: round-trip parse of real fixture data (the same fixtures used as the offline fallback).

### Component (Vitest + React Testing Library)

- `<DataDrawer>` renders the right fields given mock store state.
- `<SolScrubber>` updates `currentSol` on drag.
- `<RoverPicker>` triggers the right store action.
- 3D components are not unit-tested; we verify props and store, not pixels.

### Visual / E2E (Playwright)

- Boot: page loads, canvas renders, no console errors.
- Click rover -> `cameraMode === 'surface'` within 6s.
- Click "back" -> returns to `'orbit'`.
- Drawer open/close.
- Cached-data fallback: simulate `/data/rovers.json` 500 -> site loads with snapshot badge.
- Mobile fallback: viewport 375x812 + touch -> static hero + drawer, no canvas.

### Performance budget

These are **targets until measured in M0**, not commitments. M0 will replace these with measured numbers.

- Time to interactive: target < 3s on a fast connection.
- Target 60 fps on the orbit view (mid-tier laptop).
- Target 30 fps on the surface view (mid-tier laptop).
- Target initial bundle: < 800 KB gzipped (excluding textures, which stream). Likely tight; M0 spike measures it. If over, fallback ladder: drop `@react-three/postprocessing` for hand-rolled effects, lazy-load GSAP behind the dive trigger, code-split rover GLTFs.

CI runs Playwright Lighthouse against these, but a regression flags as a warning, not a hard failure, until budgets are confirmed.

### Manual smoke checklist (`docs/smoke-checklist.md`)

- Eyeball the dive on a real laptop and a real low-end laptop.
- Verify on Chrome, Firefox, Safari (Safari is Three.js's flakiest target).
- Verify mobile fallback on an actual phone.
- NASA attribution visible.
- GitHub Action ran successfully in the last 7 days.

### What we deliberately don't test

- Pixel-perfect 3D output. Visual regression on shader output is unreliable across drivers and brittle.
- NASA's feeds. They are not our system.

## Milestones

### M0 -- Spike

See "M0 -- Spike" section above. Output: `docs/m0-findings.md`, `docs/coords.md`, populated `data/fixtures/`, measured perf budget. **Gating:** if M0 reveals a structural problem, we revise this spec before M1.

### M1 -- "It looks like Mars and a rover is on it"

- Repo + Vite + R3F skeleton.
- `<MarsGlobe>` with MOLA displacement + albedo (low-res only).
- `<Atmosphere>` shader.
- `<Rover>` placed at Perseverance's current lat/lon -- on the globe, no surface terrain yet.
- `<TopBar>` with title + credits.
- Static `rovers.json` snapshot (sourced from the fixtures captured in M0), no Action yet.
- Deployed to GitHub Pages.

**Outcome:** rotating Mars with a glowing rover pip in the right spot. Embeddable as a hero.

### M2 -- "Two rovers, switching between them"

- Curiosity added. `<RoverPicker>` toggles.
- `<TraverseLine>` rendering past waypoints.
- `<DataDrawer>` with sol, total distance, latest notes.
- High-res Mars textures stream in (KTX2).
- Mobile fallback shipped.

### M3 -- "The dive"

- `<SurfacePatch>` for both rovers (HiRISE DEM baked via `bake-dem.mjs`, validated against the M0 coordinate work).
- `<CameraDirector>` + GSAP dive timeline.
- `<DEMLoader>` with IndexedDB cache.
- Reverse flight back to orbit.

### M4 -- "It's live"

- `refresh.yml` GitHub Action -- nightly NASA fetch with zod validation, fixture-diff issues on drift.
- Workflow declares `permissions: { contents: write, issues: write }`.
- `<SolScrubber>` to walk through traverse history.
- "Last updated" badge in `<TopBar>`.

### Stretch (post-launch)

- Sol-keyed mission imagery (Mars Photos API) in the drawer.
- Sun position by sol-of-year for accurate lighting.
- VR/WebXR mode.
- Historic rovers (Spirit, Opportunity, Sojourner).

## Open Questions

None blocking. Items to resolve during M0 / implementation:

- Exact HiRISE DTM tile IDs for each landing site (chosen during M0).
- Rover GLTF source: NASA 3D Resources publishes both rovers, but polycount may need decimation for the orbit-view LOD.
- Whether `<SolScrubber>` is a slider or a stepper. Try slider first; fall back to stepper if scrubbing reveals UX issues with very long traverses.
