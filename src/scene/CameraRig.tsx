import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { gsap } from 'gsap';
import { useAppStore } from '../store/useAppStore';
import { latLonToVec3, MARS_MEAN_RADIUS_KM } from '../data/coords';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

const GLOBE_RADIUS = 1;
const KM = 1 / MARS_MEAN_RADIUS_KM; // 1 km in scene units

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

    // Tangent frame at rover position
    const normal = latLonToVec3(rover.lat, rover.lon, 1).normalize();
    const worldUp = new Vector3(0, 1, 0);
    const east = new Vector3().crossVectors(normal, worldUp).normalize();
    const north = new Vector3().crossVectors(east, normal).normalize();

    // Phase 1 target: rover position at current orbit altitude
    const orbitDist = camera.position.length();
    const orbitTarget = latLonToVec3(rover.lat, rover.lon, orbitDist);

    // Phase 2 target: 2 km north + 0.3 km above rover surface (looking south)
    const surfaceTarget = normal.clone()
      .multiplyScalar(GLOBE_RADIUS)
      .addScaledVector(north, 2 * KM)
      .addScaledVector(normal, 0.3 * KM);

    // Camera looks at the rover's surface position during Phase 2
    const roverSurface = latLonToVec3(rover.lat, rover.lon, GLOBE_RADIUS);
    const lookProxy = { x: 0, y: 0, z: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        setCameraMode('surface');
        // OrbitControls stays disabled — minDistance would push camera back to orbit.
        // A new rover selection resets the rig from wherever the camera is.
      },
    });

    // Phase 1: rotate to face rover at orbit altitude (1.2 s)
    tl.to(camera.position, {
      x: orbitTarget.x, y: orbitTarget.y, z: orbitTarget.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(0, 0, 0);
        controlsRef.current?.update();
      },
    });

    // Phase 2a: descend to surface position (2.5 s)
    tl.to(camera.position, {
      x: surfaceTarget.x, y: surfaceTarget.y, z: surfaceTarget.z,
      duration: 2.5,
      ease: 'power3.in',
      onUpdate: () => {
        camera.lookAt(lookProxy.x, lookProxy.y, lookProxy.z);
        controlsRef.current?.update();
      },
    });

    // Phase 2b: shift lookAt from planet center toward rover (concurrent)
    tl.to(lookProxy, {
      x: roverSurface.x, y: roverSurface.y, z: roverSurface.z,
      duration: 2.5,
      ease: 'power2.inOut',
    }, '<');

    tlRef.current = tl;
    return () => { tlRef.current?.kill(); };
  }, [selectedRoverId]);

  return null;
}
