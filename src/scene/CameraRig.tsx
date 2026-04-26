import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useAppStore } from '../store/useAppStore';
import { latLonToVec3 } from '../data/coords';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraRigProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

export function CameraRig({ controlsRef }: CameraRigProps) {
  const { camera } = useThree();
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const rovers = useAppStore((s) => s.rovers);
  const setCameraMode = useAppStore((s) => s.setCameraMode);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!selectedRoverId || !rovers || !controlsRef.current) return;

    const rover = rovers[selectedRoverId as 'perseverance' | 'curiosity'];
    if (!rover) return;

    tweenRef.current?.kill();

    const dist = camera.position.length();
    const target = latLonToVec3(rover.lat, rover.lon, dist);

    controlsRef.current.enabled = false;
    setCameraMode('diving');

    tweenRef.current = gsap.to(camera.position, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.4,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(0, 0, 0);
        controlsRef.current?.update();
      },
      onComplete: () => {
        if (controlsRef.current) controlsRef.current.enabled = true;
        setCameraMode('orbit');
      },
    });

    return () => {
      tweenRef.current?.kill();
    };
  }, [selectedRoverId]);

  return null;
}
