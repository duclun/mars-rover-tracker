import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
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
  const cameraMode = useAppStore((s) => s.cameraMode);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const surfacePos = useRef<Vector3 | null>(null);
  const surfaceLookAt = useRef<Vector3 | null>(null);

  // Lock position + orientation every frame in surface mode.
  // OrbitControls.update() (even when disabled) can reset both; running at
  // priority -1 ensures we override it after all default-priority (0) hooks.
  useFrame(() => {
    if (cameraMode === 'surface' && surfacePos.current && surfaceLookAt.current) {
      camera.position.copy(surfacePos.current);
      camera.lookAt(surfaceLookAt.current);
    }
  }, -1);

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

    // Phase 1 target: rover position at current orbit altitude
    const orbitDist = camera.position.length();
    const orbitTarget = latLonToVec3(rover.lat, rover.lon, orbitDist);

    // Phase 2 target: 3 km east + 1 km above rover (east is truly horizontal in world space;
    // north/south at mid-latitudes points nearly vertical, giving a top-down view)
    const surfaceTarget = normal.clone()
      .multiplyScalar(GLOBE_RADIUS)
      .addScaledVector(east, 3 * KM)
      .addScaledVector(normal, 1 * KM);

    // Camera looks at the rover's surface position during Phase 2
    const roverSurface = latLonToVec3(rover.lat, rover.lon, GLOBE_RADIUS);
    const lookProxy = { x: 0, y: 0, z: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        surfacePos.current = surfaceTarget.clone();
        surfaceLookAt.current = roverSurface.clone();
        camera.position.copy(surfaceTarget);
        camera.lookAt(roverSurface);
        setCameraMode('surface');
      },
    });

    // Phase 1: rotate to face rover at orbit altitude (1.2 s)
    tl.to(camera.position, {
      x: orbitTarget.x, y: orbitTarget.y, z: orbitTarget.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => { camera.lookAt(0, 0, 0); },
    });

    // Phase 2a: descend to surface position (2.5 s)
    // Note: do NOT call controls.update() here — OrbitControls.update() calls
    // camera.lookAt(target=0,0,0) unconditionally, overriding Phase 2b's lookAt tween.
    tl.to(camera.position, {
      x: surfaceTarget.x, y: surfaceTarget.y, z: surfaceTarget.z,
      duration: 2.5,
      ease: 'power3.in',
      onUpdate: () => { camera.lookAt(lookProxy.x, lookProxy.y, lookProxy.z); },
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
