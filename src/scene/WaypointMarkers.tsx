import { useAppStore } from '../store/useAppStore';
import { latLonToVec3 } from '../data/coords';
import type { RoverId } from '../data/types';

const MAX_MARKERS = 150;

interface Props {
  roverId: RoverId;
  globeRadius: number;
}

export function WaypointMarkers({ roverId, globeRadius }: Props) {
  const waypoints = useAppStore((s) => s.waypoints);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const activeSol = useAppStore((s) => s.activeSol);
  const setActiveSol = useAppStore((s) => s.setActiveSol);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);
  const cameraMode = useAppStore((s) => s.cameraMode);

  if (selectedRoverId !== roverId || !waypoints || cameraMode === 'surface') return null;

  const path = waypoints[roverId];
  const step = Math.max(1, Math.ceil(path.length / MAX_MARKERS));
  const visible = path.filter((_, i) => i % step === 0);

  return (
    <group>
      {visible.map((wp) => {
        const pos = latLonToVec3(wp.lat, wp.lon, globeRadius * 1.005);
        const isActive = activeSol !== null && wp.sol <= activeSol &&
          (path[path.indexOf(wp) + step]?.sol ?? Infinity) > activeSol;
        return (
          <mesh
            key={wp.sol}
            position={[pos.x, pos.y, pos.z]}
            onClick={(e) => {
              e.stopPropagation();
              setActiveSol(wp.sol);
              setDrawerOpen(true);
            }}
          >
            <sphereGeometry args={[globeRadius * 0.0028, 6, 6]} />
            <meshStandardMaterial color={isActive ? '#ffffff' : '#ffcc44'} />
          </mesh>
        );
      })}
    </group>
  );
}
