import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { AdditiveBlending, BackSide } from 'three';

const AtmosphereMaterial = shaderMaterial(
  { intensity: 1.0 },
  /* vertex shader */
  `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  /* fragment shader */
  `
    uniform float intensity;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
      rim = pow(rim, 3.5) * intensity;
      vec3 dustColor = vec3(0.85, 0.42, 0.12);
      gl_FragColor = vec4(dustColor, rim);
    }
  `,
);

extend({ AtmosphereMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    atmosphereMaterial: {
      transparent?: boolean;
      depthWrite?: boolean;
      blending?: number;
      side?: number;
      intensity?: number;
      ref?: React.Ref<unknown>;
    };
  }
}

interface AtmosphereProps {
  radius?: number;
  intensity?: number;
}

export function Atmosphere({ radius = 1, intensity = 1.2 }: AtmosphereProps) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.06, 64, 32]} />
      <atmosphereMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={BackSide}
        intensity={intensity}
      />
    </mesh>
  );
}
