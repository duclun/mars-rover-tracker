import { latLonToVec3 } from '../data/coords';

interface RoverProps {
  lat: number;
  lon: number;
  globeRadius: number;
}

export function Rover({ lat, lon, globeRadius }: RoverProps) {
  const pos = latLonToVec3(lat, lon, globeRadius * 1.015);
  const pipRadius = globeRadius * 0.015;

  return (
    <mesh position={pos}>
      <sphereGeometry args={[pipRadius, 16, 16]} />
      <meshBasicMaterial color="#00d9ff" />
    </mesh>
  );
}
