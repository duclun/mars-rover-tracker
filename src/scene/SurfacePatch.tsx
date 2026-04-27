import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { latLonToVec3, MARS_MEAN_RADIUS_KM } from '../data/coords';

const MARS_RADIUS_M = MARS_MEAN_RADIUS_KM * 1000;
const GLOBE_RADIUS = 1;
const VERT_EXAG = 20;
const SEGMENTS = 255; // 256×256 vertices, matches MOLA 256×256 crop

interface DemMeta {
  width: number;
  height: number;
  minElev: number;
  maxElev: number;
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
}

function buildGeometry(bin: ArrayBuffer, meta: DemMeta): THREE.BufferGeometry {
  const { width, height, minElev, maxElev } = meta;
  const elevRange = maxElev - minElev;
  const raw = new DataView(bin);

  const geo = new THREE.PlaneGeometry(1, 1, SEGMENTS, SEGMENTS);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < width * height; i++) {
    const u16 = raw.getUint16(i * 2, true);
    const elev = minElev + (u16 / 65535) * elevRange;
    pos.setZ(i, (elev / MARS_RADIUS_M) * VERT_EXAG);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

interface PatchTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

function computeTransform(meta: DemMeta): PatchTransform {
  const { bbox, minElev, maxElev } = meta;
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLon = (bbox.minLon + bbox.maxLon) / 2;
  const centerElev = (minElev + maxElev) / 2;

  const position = latLonToVec3(
    centerLat,
    centerLon,
    GLOBE_RADIUS + (centerElev / MARS_RADIUS_M) * VERT_EXAG,
  );

  // Build tangent frame: East, North, Outward
  const N = position.clone().normalize();
  const East = new THREE.Vector3().crossVectors(N, new THREE.Vector3(0, 1, 0)).normalize();
  const North = new THREE.Vector3().crossVectors(East, N).normalize();

  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(East, North, N),
  );

  const centerLatRad = centerLat * Math.PI / 180;
  const latSpan = bbox.maxLat - bbox.minLat;
  const lonSpan = bbox.maxLon - bbox.minLon;
  const scaleY = (latSpan * Math.PI / 180) * GLOBE_RADIUS;
  const scaleX = (lonSpan * Math.PI / 180) * Math.cos(centerLatRad) * GLOBE_RADIUS;

  return { position, quaternion, scale: new THREE.Vector3(scaleX, scaleY, 1) };
}

function useDemPatch(roverId: string) {
  const [state, setState] = useState<{ geo: THREE.BufferGeometry; xform: PatchTransform } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/data/dem/${roverId}.json`).then(r => r.json() as Promise<DemMeta>),
      fetch(`/data/dem/${roverId}.bin`).then(r => r.arrayBuffer()),
    ]).then(([meta, bin]) => {
      if (cancelled) return;
      setState({ geo: buildGeometry(bin, meta), xform: computeTransform(meta) });
    }).catch(e => console.warn(`SurfacePatch(${roverId}): DEM load failed`, e));
    return () => { cancelled = true; };
  }, [roverId]);

  return state;
}

export function SurfacePatch({ roverId }: { roverId: 'perseverance' | 'curiosity' }) {
  const cameraMode = useAppStore((s) => s.cameraMode);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const patch = useDemPatch(roverId);

  // Only render when this rover is selected and camera has reached the surface
  if (!patch || cameraMode !== 'surface' || selectedRoverId !== roverId) return null;

  const { geo, xform } = patch;

  return (
    <mesh
      geometry={geo}
      position={xform.position}
      quaternion={xform.quaternion}
      scale={xform.scale}
    >
      <meshStandardMaterial color="#c87045" roughness={0.93} metalness={0} />
    </mesh>
  );
}
