import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RoversJsonSchema } from './types';
import type { TraversePath, WaypointPath } from './types';
import snapshotJson from '../../public/data/rovers.json';

const snapshot = RoversJsonSchema.parse(snapshotJson);

export function DataLoader() {
  const setRovers = useAppStore((s) => s.setRovers);
  const setTraverses = useAppStore((s) => s.setTraverses);
  const setWaypoints = useAppStore((s) => s.setWaypoints);

  useEffect(() => {
    // Rover positions
    fetch('/data/rovers.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((raw) => setRovers(RoversJsonSchema.parse(raw), false))
      .catch(() => setRovers(snapshot, true));

    // Traverse paths — parallel, no fallback
    Promise.all([
      fetch('/data/traverses/perseverance.json').then((r) => r.ok ? r.json() as Promise<TraversePath> : Promise.reject()),
      fetch('/data/traverses/curiosity.json').then((r) => r.ok ? r.json() as Promise<TraversePath> : Promise.reject()),
    ])
      .then(([perseverance, curiosity]) => setTraverses({ perseverance, curiosity }))
      .catch(() => { /* no traverse lines if fetch fails */ });

    // Waypoints — parallel, no fallback
    Promise.all([
      fetch('/data/waypoints/perseverance.json').then((r) => r.ok ? r.json() as Promise<WaypointPath> : Promise.reject()),
      fetch('/data/waypoints/curiosity.json').then((r) => r.ok ? r.json() as Promise<WaypointPath> : Promise.reject()),
    ])
      .then(([perseverance, curiosity]) => setWaypoints({ perseverance, curiosity }))
      .catch(() => { /* no waypoint data if fetch fails */ });
  }, [setRovers, setTraverses, setWaypoints]);

  return null;
}
