import { useAppStore } from '../store/useAppStore';
import type { Waypoint } from '../data/types';

function findActiveWaypoint(
  path: Waypoint[],
  activeSol: number | null,
): Waypoint | null {
  if (path.length === 0) return null;
  if (activeSol === null) return path[path.length - 1];
  let result: Waypoint | null = null;
  for (const wp of path) {
    if (wp.sol <= activeSol) result = wp;
  }
  return result;
}

export function DataDrawer() {
  const rovers = useAppStore((s) => s.rovers);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);
  const waypoints = useAppStore((s) => s.waypoints);
  const activeSol = useAppStore((s) => s.activeSol);
  const setActiveSol = useAppStore((s) => s.setActiveSol);

  if (!drawerOpen || !selectedRoverId || !rovers) return null;

  const rover = rovers[selectedRoverId as 'perseverance' | 'curiosity'];
  if (!rover) return null;

  const distKm = (rover.dist_total_m / 1000).toFixed(1);

  const waypointPath = waypoints?.[selectedRoverId as 'perseverance' | 'curiosity'] ?? [];
  const activeWp = findActiveWaypoint(waypointPath, activeSol);
  const note = activeWp?.note || '—';

  function handleClose() {
    setDrawerOpen(false);
    setActiveSol(null);
  }

  return (
    <aside style={{
      position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)',
      zIndex: 20, width: 260,
      background: 'rgba(8,12,20,0.82)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      padding: '20px 20px 16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.02em' }}>
          {rover.name}
        </span>
        <button
          aria-label="Close drawer"
          onClick={handleClose}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >
          ×
        </button>
      </div>

      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 12, columnGap: 8 }}>
        <Stat label="Sol" value={`Sol ${rover.currentSol}`} />
        <Stat label="Distance" value={`${distKm} km`} />
        <Stat label="Latitude" value={`${rover.lat.toFixed(4)}°`} />
        <Stat label="Longitude" value={`${rover.lon.toFixed(4)}°`} />
        <Stat label="Elevation" value={`${rover.elev_geoid.toFixed(0)} m`} />
        <Stat label="RMC" value={rover.RMC} />
      </dl>

      {note !== '—' || waypointPath.length > 0 ? (
        <p style={{
          marginTop: 14, marginBottom: 0,
          fontSize: 12, color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12,
        }}>
          {note}
        </p>
      ) : null}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </dd>
    </div>
  );
}
