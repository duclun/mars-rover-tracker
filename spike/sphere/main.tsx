import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { latLonToVec3, MARS_MEAN_RADIUS_KM } from '../../src/data/coords';
import waypoints from '../../data/fixtures/M20_waypoints.json';
import { WaypointFeatureCollectionSchema } from '../../src/data/schema';

const collection = WaypointFeatureCollectionSchema.parse(waypoints);
const latest = collection.features[collection.features.length - 1];
const { lat, lon } = latest.properties;

// Scale: 1 unit = 100 km, so Mars radius is ~33.9 units.
const SCALE = 1 / 100;
const radius = MARS_MEAN_RADIUS_KM * SCALE;
const markerPos: Vector3 = latLonToVec3(lat, lon, radius * 1.005); // 0.5% above surface

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[100, 50, 50]} intensity={1.5} />

      {/* Mars: solid color for now, displacement maps come in M1 */}
      <mesh>
        <sphereGeometry args={[radius, 64, 32]} />
        <meshStandardMaterial color="#a04522" roughness={1} />
      </mesh>

      {/* Rover marker: small bright sphere */}
      <mesh position={markerPos}>
        <sphereGeometry args={[radius * 0.01, 16, 16]} />
        <meshBasicMaterial color="#00d9ff" />
      </mesh>

      <OrbitControls />
    </>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [60, 40, 60], fov: 45 }}>
        <Scene />
      </Canvas>
      <div style={{
        position: 'absolute', top: 10, left: 10, color: '#fff',
        font: '13px ui-monospace, monospace', background: 'rgba(0,0,0,0.6)',
        padding: 8, borderRadius: 4,
      }}>
        Spike: sphere + rover marker<br/>
        Perseverance latest waypoint:<br/>
        sol {latest.properties.sol}, lat {lat.toFixed(4)} deg, lon {lon.toFixed(4)} deg<br/>
        Cyan marker should sit on the sphere&apos;s surface.
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
