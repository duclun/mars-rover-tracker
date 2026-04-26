import { useAppStore } from '../store/useAppStore';

export function DataDrawer() {
  const rovers = useAppStore((s) => s.rovers);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);

  if (!drawerOpen || !selectedRoverId || !rovers) return null;

  const rover = rovers[selectedRoverId as 'perseverance' | 'curiosity'];
  if (!rover) return null;
  const distKm = (rover.dist_total_m / 1000).toFixed(1);

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
          onClick={() => setDrawerOpen(false)}
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
