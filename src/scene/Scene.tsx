import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MarsGlobe } from './MarsGlobe';
import { Atmosphere } from './Atmosphere';
import { Rover } from './Rover';
import { TraverseLine } from './TraverseLine';
import { CameraRig } from './CameraRig';
import { SurfacePatch } from './SurfacePatch';
import { WaypointMarkers } from './WaypointMarkers';
import { useAppStore } from '../store/useAppStore';

const GLOBE_RADIUS = 1;

function useTraverseMaxIndex(roverId: 'perseverance' | 'curiosity'): number | undefined {
  const waypoints = useAppStore((s) => s.waypoints);
  const activeSol = useAppStore((s) => s.activeSol);
  if (activeSol === null || !waypoints) return undefined;
  const path = waypoints[roverId];
  let idx = 0;
  for (let i = 0; i < path.length; i++) {
    if (path[i].sol <= activeSol) idx = i + 1;
  }
  return idx;
}

function SceneContents() {
  const rovers = useAppStore((s) => s.rovers);
  const traverses = useAppStore((s) => s.traverses);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const cameraMode = useAppStore((s) => s.cameraMode);
  const p = rovers?.perseverance;
  const c = rovers?.curiosity;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const persMaxIndex = useTraverseMaxIndex('perseverance');
  const curMaxIndex = useTraverseMaxIndex('curiosity');

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 3, 5]} intensity={2.2} color="#fff8e7" />

      <Suspense fallback={null}>
        <MarsGlobe radius={GLOBE_RADIUS} />
      </Suspense>
      <Atmosphere radius={GLOBE_RADIUS} />

      {traverses && (
        <>
          <TraverseLine path={traverses.perseverance} globeRadius={GLOBE_RADIUS} color="#00d9ff" maxIndex={persMaxIndex} />
          <TraverseLine path={traverses.curiosity} globeRadius={GLOBE_RADIUS} color="#ff9c42" maxIndex={curMaxIndex} />
        </>
      )}

      {p && <Rover lat={p.lat} lon={p.lon} globeRadius={GLOBE_RADIUS} selected={selectedRoverId === 'perseverance'} />}
      {c && <Rover lat={c.lat} lon={c.lon} globeRadius={GLOBE_RADIUS} selected={selectedRoverId === 'curiosity'} />}

      <WaypointMarkers roverId="perseverance" globeRadius={GLOBE_RADIUS} />
      <WaypointMarkers roverId="curiosity" globeRadius={GLOBE_RADIUS} />

      <OrbitControls
        ref={controlsRef}
        enabled={cameraMode === 'orbit'}
        enablePan={false}
        minDistance={GLOBE_RADIUS * 1.3}
        maxDistance={GLOBE_RADIUS * 8}
        autoRotate={false}
      />

      <CameraRig controlsRef={controlsRef} />

      <Suspense fallback={null}>
        <SurfacePatch roverId="perseverance" />
        <SurfacePatch roverId="curiosity" />
      </Suspense>

      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.9} />
      </EffectComposer>
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45, near: 0.00001, far: 100 }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContents />
    </Canvas>
  );
}
