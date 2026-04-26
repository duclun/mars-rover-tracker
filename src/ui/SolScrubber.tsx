import { useAppStore } from '../store/useAppStore';

export function SolScrubber() {
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const waypoints = useAppStore((s) => s.waypoints);
  const activeSol = useAppStore((s) => s.activeSol);
  const setActiveSol = useAppStore((s) => s.setActiveSol);

  if (!drawerOpen || !selectedRoverId || !waypoints) return null;

  const path = waypoints[selectedRoverId as 'perseverance' | 'curiosity'];
  if (!path || path.length === 0) return null;

  const minSol = path[0].sol;
  const maxSol = path[path.length - 1].sol;
  const value = activeSol ?? maxSol;

  return (
    <div style={{
      position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      zIndex: 15, width: 280,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <label style={{
        fontSize: 11, color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Sol {value}
      </label>
      <input
        type="range"
        min={minSol}
        max={maxSol}
        value={value}
        onChange={(e) => setActiveSol(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#00d9ff', cursor: 'pointer' }}
      />
    </div>
  );
}
