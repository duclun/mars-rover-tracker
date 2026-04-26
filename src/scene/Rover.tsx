import { latLonToVec3 } from '../data/coords';

interface RoverProps {
  lat: number;
  lon: number;
  globeRadius: number;
  selected?: boolean;
}

export function Rover({ lat, lon, globeRadius, selected = false }: RoverProps) {
  const pos = latLonToVec3(lat, lon, globeRadius * 1.015);
  const pipRadius = globeRadius * (selected ? 0.022 : 0.015);

  return (
    <mesh position={pos}>
      <sphereGeometry args={[pipRadius, 16, 16]} />
      <meshBasicMaterial color={selected ? '#ffffff' : '#00d9ff'} />
    </mesh>
  );
}
