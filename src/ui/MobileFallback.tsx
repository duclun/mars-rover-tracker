import { RoverPicker } from './RoverPicker';
import { DataDrawer } from './DataDrawer';

export function MobileFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at center, #1a0a06 0%, #000 70%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif', color: '#fff',
    }}>
      <div
        aria-hidden="true"
        style={{
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #c1440e, #6b1a00)',
          marginBottom: 32, opacity: 0.85,
          boxShadow: '0 0 60px rgba(193,68,14,0.4)',
        }}
      />

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.04em' }}>
        Mars Rover Tracker
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', textAlign: 'center', padding: '0 32px' }}>
        Open on a desktop browser for the 3D experience.
      </p>

      <div style={{ position: 'relative', height: 56, width: '100%' }}>
        <RoverPicker />
      </div>
      <DataDrawer />

      <a
        href="https://mars.nasa.gov/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute', bottom: 16,
          fontSize: 11, color: 'rgba(255,255,255,0.35)', textDecoration: 'underline',
        }}
      >
        NASA/JPL-Caltech
      </a>
    </div>
  );
}
