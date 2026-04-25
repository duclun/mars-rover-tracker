import { z } from 'zod';

// MMGIS field naming notes (observed against live JPL fixtures, 2026-04-25):
// - Cumulative distance is `dist_total_m`, not `dist_total`.
// - Per-sol drive notes use `Note` (capital N) when present, not `notes`.
// - There is no `pos` field; the rover identifier per sol is `RMC` (e.g. "87_5154").
// - M20 traverse features use LineString geometry; MSL uses MultiLineString.
// - Many additional fields (easting, northing, roll, pitch, yaw, images, etc.)
//   are present per-feature; we tolerate them via `.passthrough()` on properties.

const Coord2D = z.tuple([z.number(), z.number()]);
const Coord3D = z.tuple([z.number(), z.number(), z.number()]);
const Coord = Coord2D.or(Coord3D);

export const PointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: Coord,
});

export const LineStringGeometrySchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(Coord),
});

export const MultiLineStringGeometrySchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(Coord)),
});

export const WaypointPropertiesSchema = z.object({
  RMC: z.string(),
  sol: z.number().int(),
  site: z.number().int(),
  drive: z.number().int(),
  lon: z.number(),
  lat: z.number(),
  elev_geoid: z.number(),
  dist_m: z.number(),
  dist_total_m: z.number(),
  Note: z.string().optional(),
}).passthrough();

export const WaypointFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: PointGeometrySchema,
  properties: WaypointPropertiesSchema,
});

export const WaypointFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(WaypointFeatureSchema),
}).passthrough();

export const TraverseFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: LineStringGeometrySchema.or(MultiLineStringGeometrySchema),
  properties: z.record(z.unknown()),
});

export const TraverseFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(TraverseFeatureSchema),
}).passthrough();

export type Waypoint = z.infer<typeof WaypointFeatureSchema>;
export type WaypointCollection = z.infer<typeof WaypointFeatureCollectionSchema>;
export type TraverseCollection = z.infer<typeof TraverseFeatureCollectionSchema>;
