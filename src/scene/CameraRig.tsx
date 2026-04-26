import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useAppStore } from '../store/useAppStore';
import { latLonToVec3 } from '../data/coords';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

const GLOBE_RADIUS = 1;

// ~3400 m above areoid -- clears all MOLA terrain with 5x vertical exaggeration
const SURFACE_RADIUS = GLOBE_RADIUS + 0.001;

interface CameraRigProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

export function CameraRig({ controlsRef }: CameraRigProps) {
  const { camera } = useThree();
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const rovers = useAppStore((s) => s.rovers);
  const setCameraMode = useAppStore((s) => s.setCameraMode);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!selectedRoverId || !rovers || !controlsRef.current) return;

    const rover = rovers[selectedRoverId as 'perseverance' | 'curiosity'];
    if (!rover) return;

    tlRef.current?.kill();
    controlsRef.current.enabled = false;
    setCameraMode('diving');

    const orbitDist = camera.position.length();
    const orbitTarget = latLonToVec3(rover.lat, rover.lon, orbitDist);
    const surfaceTarget = latLonToVec3(rover.lat, rover.lon, SURFACE_RADIUS);

    const tl = gsap.timeline({
      onComplete: () => {
        setCameraMode('surface');
        if (controlsRef.current) controlsRef.current.enabled = true;
      },
    });

    // Phase 1: rotate at orbit altitude to face the rover (1.2 s)
    tl.to(camera.position, {
      x: orbitTarget.x, y: orbitTarget.y, z: orbitTarget.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(0, 0, 0);
        controlsRef.current?.update();
      },
    });

    // Phase 2: descend to surface altitude (2.5 s)
    tl.to(camera.position, {
      x: surfaceTarget.x, y: surfaceTarget.y, z: surfaceTarget.z,
      duration: 2.5,
      ease: 'power3.in',
      onUpdate: () => {
        camera.lookAt(0, 0, 0);
        controlsRef.current?.update();
      },
    });

    tlRef.current = tl;
    return () => { tlRef.current?.kill(); };
  }, [selectedRoverId]);

  return null;
}
