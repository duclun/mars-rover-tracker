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
