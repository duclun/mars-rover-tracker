import { z } from 'zod';

export const PointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]).or(
    z.tuple([z.number(), z.number(), z.number()]),
  ),
});

export const LineStringGeometrySchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(
    z.tuple([z.number(), z.number()]).or(
      z.tuple([z.number(), z.number(), z.number()]),
    ),
  ),
});

export const WaypointPropertiesSchema = z.object({
  sol: z.number().int(),
  site: z.number().int(),
  pos: z.number().int(),
  lon: z.number(),
  lat: z.number(),
  elev_geoid: z.number(),
  drive: z.number().int(),
  dist_m: z.number(),
  dist_total: z.number(),
  notes: z.string().optional(),
}).passthrough();

export const WaypointFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: PointGeometrySchema,
  properties: WaypointPropertiesSchema,
});

export const WaypointFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(WaypointFeatureSchema),
});

export const TraverseFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: LineStringGeometrySchema,
  properties: z.record(z.unknown()),
});

export const TraverseFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(TraverseFeatureSchema),
});

export type Waypoint = z.infer<typeof WaypointFeatureSchema>;
export type WaypointCollection = z.infer<typeof WaypointFeatureCollectionSchema>;
export type TraverseCollection = z.infer<typeof TraverseFeatureCollectionSchema>;
