import { Vector3 } from 'three';

// IAU 2000 Mars volumetric mean radius. Used as the sphere radius for the
// orbit-view globe. For per-point elevations, add elev_geoid (in meters,
// converted to km) to this base.
export const MARS_MEAN_RADIUS_KM = 3389.5;
export const MARS_EQUATORIAL_RADIUS_KM = 3396.2;
export const MARS_POLAR_RADIUS_KM = 3376.2;

/**
 * Convert planetographic latitude/longitude (degrees, east-positive) to a
 * Three.js Vector3 on a sphere of the given radius.
 *
 * Frame convention (right-handed):
 *   +X = (lat=0, lon=0)   prime meridian on equator
 *   +Y = north pole
 *   +Z = (lat=0, lon=+90) 90 deg east on equator
 *
 * MMGIS publishes lon in [-180, 180] east-positive and lat in [-90, 90]
 * planetographic. We treat planetographic == planetocentric for sphere math;
 * the difference (~0.3 deg max on Mars at mid-latitudes) is below our
 * visualization precision.
 */
export function latLonToVec3(latDeg: number, lonDeg: number, radius: number): Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return new Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon),
  );
}

/** Inverse of latLonToVec3. Returns degrees. */
export function vec3ToLatLon(v: Vector3): { lat: number; lon: number; radius: number } {
  const radius = v.length();
  const lat = Math.asin(v.y / radius) * (180 / Math.PI);
  const lon = Math.atan2(v.z, v.x) * (180 / Math.PI);
  return { lat, lon, radius };
}
