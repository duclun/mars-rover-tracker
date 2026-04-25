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
    rovers: null, selectedRoverId: null, currentSol: 0,
    cameraMode: 'orbit', drawerOpen: false, stale: false,
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
