import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, Mesh, SRGBColorSpace } from 'three';

interface MarsGlobeProps {
  radius?: number;
}

export function MarsGlobe({ radius = 1 }: MarsGlobeProps) {
  const ref = useRef<Mesh>(null);
  const albedo = useLoader(TextureLoader, '/data/textures/mars-albedo.jpg');
  const elevation = useLoader(TextureLoader, '/data/textures/mars-elev.png');

  albedo.colorSpace = SRGBColorSpace;

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.025;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 128, 64]} />
      <meshStandardMaterial
        map={albedo}
        displacementMap={elevation}
        displacementScale={radius * 0.012}
        displacementBias={-0.006}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
}
