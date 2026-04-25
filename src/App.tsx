import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Mesh } from 'three';
import gsap from 'gsap';
import { create } from 'zustand';
import { z } from 'zod';

const DemoStateSchema = z.object({ count: z.number() });
type DemoState = z.infer<typeof DemoStateSchema> & { increment: () => void };

const useDemo = create<DemoState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

function Spinner() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.5; });
  return (
    <mesh ref={ref} onClick={(e) => {
      e.stopPropagation();
      gsap.to(e.object.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.4, yoyo: true, repeat: 1 });
    }}>
      <sphereGeometry args={[1, 64, 32]} />
      <meshStandardMaterial color="#a04522" roughness={1} />
    </mesh>
  );
}

export function App() {
  const count = useDemo((s) => s.count);
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <Spinner />
        <OrbitControls />
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.2} />
        </EffectComposer>
      </Canvas>
      <div style={{ position: 'absolute', top: 10, left: 10, color: '#fff', fontFamily: 'sans-serif' }}>
        clicks: {count}
      </div>
    </div>
  );
}
