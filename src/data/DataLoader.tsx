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
