import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { MarsGlobe } from './MarsGlobe';
import { Atmosphere } from './Atmosphere';
import { Rover } from './Rover';
import { TraverseLine } from './TraverseLine';
import { useAppStore } from '../store/useAppStore';

const GLOBE_RADIUS = 1;

function SceneContents() {
  const rovers = useAppStore((s) => s.rovers);
  const traverses = useAppStore((s) => s.traverses);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const p = rovers?.perseverance;
  const c = rovers?.curiosity;

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
          <TraverseLine path={traverses.perseverance} globeRadius={GLOBE_RADIUS} color="#00d9ff" />
          <TraverseLine path={traverses.curiosity} globeRadius={GLOBE_RADIUS} color="#ff9c42" />
        </>
      )}

      {p && <Rover lat={p.lat} lon={p.lon} globeRadius={GLOBE_RADIUS} selected={selectedRoverId === 'perseverance'} />}
      {c && <Rover lat={c.lat} lon={c.lon} globeRadius={GLOBE_RADIUS} selected={selectedRoverId === 'curiosity'} />}

      <OrbitControls
        enablePan={false}
        minDistance={GLOBE_RADIUS * 1.3}
        maxDistance={GLOBE_RADIUS * 8}
        autoRotate={false}
      />

      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.9} />
      </EffectComposer>
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContents />
    </Canvas>
  );
}
