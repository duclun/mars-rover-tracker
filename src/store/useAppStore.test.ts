import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import type { RoversJson } from '../data/types';

const mockRovers: RoversJson = {
  perseverance: {
    id: 'perseverance', name: 'Perseverance', currentSol: 1840,
    lat: 18.43, lon: 77.22, elev_geoid: -2540.5, dist_total_m: 19842.1,
    RMC: '87_5154', fetchedAt: '2026-04-25T00:00:00.000Z',
  },
  curiosity: {
    id: 'curiosity', name: 'Curiosity', currentSol: 4868,
    lat: -4.81, lon: 137.38, elev_geoid: -4510.2, dist_total_m: 31820.4,
    RMC: '100_200', fetchedAt: '2026-04-25T00:00:00.000Z',
  },
  lastUpdated: '2026-04-25T00:00:00.000Z',
};

beforeEach(() => {
  useAppStore.setState({
    rovers: null, traverses: null, selectedRoverId: null, currentSol: 0,
    cameraMode: 'orbit', drawerOpen: false, stale: false,
    waypoints: null, activeSol: null,
  });
});

describe('useAppStore', () => {
  it('starts with null rovers and orbit mode', () => {
    const s = useAppStore.getState();
    expect(s.rovers).toBeNull();
    expect(s.selectedRoverId).toBeNull();
    expect(s.cameraMode).toBe('orbit');
    expect(s.drawerOpen).toBe(false);
    expect(s.stale).toBe(false);
  });

  it('setRovers populates rovers and stale flag', () => {
    useAppStore.getState().setRovers(mockRovers, false);
    const s = useAppStore.getState();
    expect(s.rovers?.perseverance.currentSol).toBe(1840);
    expect(s.stale).toBe(false);
  });

  it('setRovers with stale=true marks the data as cached', () => {
    useAppStore.getState().setRovers(mockRovers, true);
    expect(useAppStore.getState().stale).toBe(true);
  });

  it('selectRover sets selectedRoverId', () => {
    useAppStore.getState().selectRover('curiosity');
    expect(useAppStore.getState().selectedRoverId).toBe('curiosity');
  });

  it('setDrawerOpen toggles drawerOpen', () => {
    useAppStore.getState().setDrawerOpen(true);
    expect(useAppStore.getState().drawerOpen).toBe(true);
    useAppStore.getState().setDrawerOpen(false);
    expect(useAppStore.getState().drawerOpen).toBe(false);
  });
});

describe('useAppStore -- traverses', () => {
  it('starts with null traverses', () => {
    expect(useAppStore.getState().traverses).toBeNull();
  });

  it('setTraverses stores the path data', () => {
    const t = {
      perseverance: [[18.43, 77.22], [18.44, 77.23]] as [number, number][],
      curiosity: [[-4.81, 137.38]] as [number, number][],
    };
    useAppStore.getState().setTraverses(t);
    expect(useAppStore.getState().traverses?.perseverance).toHaveLength(2);
    expect(useAppStore.getState().traverses?.curiosity).toHaveLength(1);
  });
});

describe('useAppStore -- cameraMode', () => {
  it('starts in orbit mode', () => {
    expect(useAppStore.getState().cameraMode).toBe('orbit');
  });

  it('setCameraMode updates the mode', () => {
    useAppStore.getState().setCameraMode('diving');
    expect(useAppStore.getState().cameraMode).toBe('diving');
    useAppStore.getState().setCameraMode('orbit');
    expect(useAppStore.getState().cameraMode).toBe('orbit');
  });
});

describe('useAppStore -- waypoints', () => {
  it('starts with null waypoints', () => {
    expect(useAppStore.getState().waypoints).toBeNull();
  });

  it('setWaypoints stores waypoint data', () => {
    const w = {
      perseverance: [{ lat: 18.43, lon: 77.22, sol: 100, distKm: 0.5, note: 'Stop 1' }],
      curiosity: [{ lat: -4.81, lon: 137.38, sol: 50, distKm: 0.2, note: '' }],
    };
    useAppStore.getState().setWaypoints(w);
    expect(useAppStore.getState().waypoints?.perseverance).toHaveLength(1);
    expect(useAppStore.getState().waypoints?.perseverance[0].sol).toBe(100);
  });
});

describe('useAppStore -- activeSol', () => {
  it('starts with null activeSol', () => {
    expect(useAppStore.getState().activeSol).toBeNull();
  });

  it('setActiveSol updates activeSol', () => {
    useAppStore.getState().setActiveSol(500);
    expect(useAppStore.getState().activeSol).toBe(500);
    useAppStore.getState().setActiveSol(null);
    expect(useAppStore.getState().activeSol).toBeNull();
  });
});
