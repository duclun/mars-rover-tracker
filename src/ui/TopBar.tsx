import { useAppStore } from '../store/useAppStore';

export function TopBar() {
  const stale = useAppStore((s) => s.stale);
  const rovers = useAppStore((s) => s.rovers);

  return (
    <header style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)',
      pointerEvents: 'none',
    }}>
      <span style={{
        color: '#fff', fontFamily: 'system-ui, sans-serif',
        fontSize: 18, fontWeight: 700, letterSpacing: '0.04em',
      }}>
        Mars Rover Tracker
      </span>
      <span style={{
        color: 'rgba(255,255,255,0.55)', fontFamily: 'system-ui, sans-serif', fontSize: 12,
        pointerEvents: 'auto',
      }}>
        {stale && '(cached) '}
        {rovers?.lastUpdated ? `Updated ${rovers.lastUpdated.slice(0, 10)} · ` : ''}
        <a
          href="https://mars.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}
        >
          NASA/JPL-Caltech
        </a>
      </span>
    </header>
  );
}
