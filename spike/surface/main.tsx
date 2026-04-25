import { StrictMode, useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PlaneGeometry, BufferAttribute, Vector3 } from 'three';
import meta from '../../data/dem/perseverance.json';
import demBinUrl from '../../data/dem/perseverance.bin?url';
import waypoints from '../../data/fixtures/M20_waypoints.json';
import { WaypointFeatureCollectionSchema } from '../../src/data/schema';

const collection = WaypointFeatureCollectionSchema.parse(waypoints);
const latest = collection.features[collection.features.length - 1];

async function loadHeightfield(): Promise<Float32Array> {
  const res = await fetch(demBinUrl);
  const buf = await res.arrayBuffer();
  const view = new DataView(buf);
  const { width, height, minElev, maxElev } = meta;
  const range = maxElev - minElev;
  const elevs = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const norm = view.getUint16(i * 2, true) / 65535;
    elevs[i] = minElev + norm * range;
  }
  return elevs;
}

const KM_PER_DEG_LAT = 59.27;
const midLat = (meta.bbox.minLat + meta.bbox.maxLat) / 2;
const kmPerDegLon = KM_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
const widthKm = (meta.bbox.maxLon - meta.bbox.minLon) * kmPerDegLon;
const heightKm = (meta.bbox.maxLat - meta.bbox.minLat) * KM_PER_DEG_LAT;

function Terrain({ elevations }: { elevations: Float32Array }) {
  const geom = useMemo(() => {
    const { width, height } = meta;
    const g = new PlaneGeometry(widthKm, heightKm, width - 1, height - 1);
    g.rotateX(-Math.PI / 2); // lay flat in XZ plane
    const positions = g.attributes.position as BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, elevations[i] / 1000); // meters -> km
    }
    g.computeVertexNormals();
    return g;
  }, [elevations]);

  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#a04522" roughness={1} flatShading />
    </mesh>
  );
}

function RoverMarker() {
  const { bbox } = meta;
  const u = (latest.properties.lon - bbox.minLon) / (bbox.maxLon - bbox.minLon);
  const v = (latest.properties.lat - bbox.minLat) / (bbox.maxLat - bbox.minLat);
  const x = (u - 0.5) * widthKm;
  const z = -(v - 0.5) * heightKm; // north is -Z on the rotated plane
  const y = latest.properties.elev_geoid / 1000 + 0.05; // 50 m above ground

  return (
    <mesh position={new Vector3(x, y, z)}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color="#00d9ff" />
    </mesh>
  );
}

function Scene({ elevations }: { elevations: Float32Array }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
      <Terrain elevations={elevations} />
      <RoverMarker />
      <OrbitControls />
    </>
  );
}

function App() {
  const [elevations, setElevations] = useState<Float32Array | null>(null);

  useEffect(() => {
    loadHeightfield().then(setElevations);
  }, []);

  if (!elevations) {
    return <div style={{ color: '#fff', padding: 24, fontFamily: 'monospace' }}>Loading heightfield...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [5, 3, 5], fov: 55 }}>
        <Scene elevations={elevations} />
      </Canvas>
      <div style={{
        position: 'absolute', top: 10, left: 10, color: '#fff',
        font: '13px ui-monospace, monospace', background: 'rgba(0,0,0,0.6)',
        padding: 8, borderRadius: 4,
      }}>
        Spike: surface + rover marker<br />
        DEM: {meta.width}x{meta.height} cells, {(meta.maxElev - meta.minElev).toFixed(0)} m relief<br />
        sol {latest.properties.sol}, lat {latest.properties.lat.toFixed(4)}, lon {latest.properties.lon.toFixed(4)}<br />
        Cyan marker should sit on the terrain surface.
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
