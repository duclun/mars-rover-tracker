import { create } from 'zustand';
import type { RoverId, RoversJson, Traverses, Waypoints } from '../data/types';

interface AppState {
  rovers: RoversJson | null;
  traverses: Traverses | null;
  selectedRoverId: RoverId | null;
  currentSol: number;
  cameraMode: 'orbit' | 'diving' | 'surface';
  drawerOpen: boolean;
  stale: boolean;
  waypoints: Waypoints | null;
  activeSol: number | null;
  // actions
  setRovers: (rovers: RoversJson, stale: boolean) => void;
  setTraverses: (traverses: Traverses) => void;
  selectRover: (id: RoverId) => void;
  setDrawerOpen: (open: boolean) => void;
  setCameraMode: (mode: 'orbit' | 'diving' | 'surface') => void;
  setWaypoints: (waypoints: Waypoints) => void;
  setActiveSol: (sol: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  rovers: null,
  traverses: null,
  selectedRoverId: null,
  currentSol: 0,
  cameraMode: 'orbit',
  drawerOpen: false,
  stale: false,
  waypoints: null,
  activeSol: null,
  setRovers: (rovers, stale) => set({ rovers, stale }),
  setTraverses: (traverses) => set({ traverses }),
  selectRover: (id) => set({ selectedRoverId: id }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setWaypoints: (waypoints) => set({ waypoints }),
  setActiveSol: (sol) => set({ activeSol: sol }),
}));
