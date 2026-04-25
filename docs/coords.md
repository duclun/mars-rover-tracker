# Coordinate Reference

This document records the coordinate-system choices for the Mars Rover Tracker
so future contributors don't have to re-derive them.

## Mars geodetic constants

| Constant | Value | Source |
|---|---|---|
| Equatorial radius | 3396.2 km | IAU 2000 / NASA Mars Fact Sheet |
| Polar radius | 3376.2 km | IAU 2000 |
| Volumetric mean radius | 3389.5 km | IAU 2000 |

We use the **volumetric mean radius (3389.5 km)** as the sphere radius for the
orbit-view globe. The flattening is small enough (~0.59%) that an oblate
spheroid model is not worth the complexity at orbit-view zoom levels.

## Latitude / longitude conventions

- **Latitude:** degrees, [-90, 90], north positive. Planetographic.
- **Longitude:** degrees, [-180, 180], east positive (per IAU 2015).

JPL MMGIS publishes lat/lon in this convention. We do not convert.

### Planetographic vs planetocentric

Mars publications mix two latitude conventions:
- **Planetocentric:** the angle between the equator and a line drawn from
  the planet center to the surface point.
- **Planetographic:** the angle between the equator and the local surface
  normal (perpendicular to the surface).

The difference on Mars is at most ~0.3 degrees at mid-latitudes, which
corresponds to ~18 km of surface displacement at worst. For our orbit-view
visualization (where Mars is rendered at ~3389 km radius), this is below
visible precision. We treat them as equivalent for sphere math and document
this assumption in `coords.ts`.

If centimeter-level surface alignment becomes required (e.g. for a future
"rover instrument footprint" feature), revisit this and apply the proper
WGS-84-style conversion using the polar/equatorial flattening.

## Three.js frame convention

We use a right-handed coordinate system aligned with Three.js defaults:

| Axis | Direction |
|---|---|
| +X | Mars prime meridian (lon=0) on equator |
| +Y | North pole |
| +Z | lon=+90 (east) on equator |

Camera positioning treats +Y as up, consistent with Three.js defaults.

## Elevation

MMGIS waypoints carry `elev_geoid` in **meters** relative to the Mars geoid.
For surface placement, the rover's 3D position is:

    surface_radius_km = MARS_MEAN_RADIUS_KM + (elev_geoid / 1000)
    pos = latLonToVec3(lat, lon, surface_radius_km)

For globe view we currently ignore elevation (rovers are placed on the mean
sphere). The visual error is < 5 km out of 3389.5 km radius (< 0.15% of the
sphere) and not noticeable at orbit zoom.

## Surface DEM alignment (HiRISE)

HiRISE DTMs are published as GeoTIFFs in equirectangular projection on the
Mars 2000 datum, with elevations in meters relative to the IAU 2000 reference
ellipsoid (NOT the geoid -- different from MMGIS's elev_geoid).

To place a rover marker on a baked HiRISE patch:

1. Load the patch's bounding box (minLon, maxLon, minLat, maxLat) and pixel
   dimensions from the metadata sidecar produced by `bake-dem.mjs`.
2. Compute the rover's pixel-space position:
       u = (rover.lon - minLon) / (maxLon - minLon)
       v = (rover.lat - minLat) / (maxLat - minLat)
3. Sample the heightfield at (u, v) to get the local elevation in meters.
4. Place the marker at the corresponding mesh vertex in Three.js space, with
   y-offset equal to the sampled height plus a small "above ground" delta.

The geoid-vs-ellipsoid difference between MMGIS's elev_geoid and the HiRISE
ellipsoid heights is up to ~2 km globally on Mars but typically ~tens of
meters at any given site. For visualizing rover position relative to its
local terrain, sampling the DEM directly (step 3) avoids this issue entirely.

## Risks captured

- We assume MMGIS uses planetographic lat. If a future MMGIS endpoint switches
  to planetocentric, surface alignment will drift by up to ~18 km; the M0
  spike's visual check (markers sitting on the DEM surface) is the canary.
- HiRISE DTM alignment is the highest-risk step in M3. The M0 spike's
  surface-render task validates the chain end-to-end before M3 commits.
