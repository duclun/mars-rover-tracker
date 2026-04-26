import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { latLonToVec3 } from '../data/coords';

interface TraverseLineProps {
  path: [number, number][];
  globeRadius: number;
  color?: string;
  maxIndex?: number;
}

export function TraverseLine({ path, globeRadius, color = '#ff8c42', maxIndex }: TraverseLineProps) {
  const points = useMemo<Vector3[]>(() => {
    const clipped = maxIndex !== undefined ? path.slice(0, maxIndex) : path;
    return clipped.map(([lat, lon]) => latLonToVec3(lat, lon, globeRadius * 1.003));
  }, [path, globeRadius, maxIndex]);

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
