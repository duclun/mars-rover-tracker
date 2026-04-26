import { useAppStore } from '../store/useAppStore';
import type { RoverId } from '../data/types';

const ROVER_IDS: RoverId[] = ['perseverance', 'curiosity'];
const ROVER_LABELS: Record<RoverId, string> = {
  perseverance: 'Perseverance',
  curiosity: 'Curiosity',
};

export function RoverPicker() {
  const selectedRoverId = useAppStore((s) => s.selectedRoverId);
  const selectRover = useAppStore((s) => s.selectRover);
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);

  function handleClick(id: RoverId) {
    selectRover(id);
    setDrawerOpen(true);
  }

  return (
    <div style={{
      position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 12, zIndex: 10,
    }}>
      {ROVER_IDS.map((id) => {
        const active = selectedRoverId === id;
        return (
          <button
            key={id}
            aria-pressed={active}
            onClick={() => handleClick(id)}
            style={{
              padding: '10px 22px',
              borderRadius: 24,
              border: `2px solid ${active ? '#00d9ff' : 'rgba(255,255,255,0.3)'}`,
              background: active ? 'rgba(0,217,255,0.15)' : 'rgba(0,0,0,0.55)',
              color: active ? '#00d9ff' : 'rgba(255,255,255,0.7)',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
              fontWeight: active ? 700 : 400,
              letterSpacing: '0.03em',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            {ROVER_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
