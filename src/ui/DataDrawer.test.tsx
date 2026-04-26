import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataDrawer } from './DataDrawer';
import { useAppStore } from '../store/useAppStore';
import type { RoversJson } from '../data/types';

const mockRovers: RoversJson = {
  perseverance: {
    id: 'perseverance', name: 'Perseverance', currentSol: 1840,
    lat: 18.43, lon: 77.22, elev_geoid: -2540.5, dist_total_m: 19842.1,
    RMC: '87_5154', fetchedAt: '2026-04-25T12:00:00.000Z',
  },
  curiosity: {
    id: 'curiosity', name: 'Curiosity', currentSol: 4868,
    lat: -4.81, lon: 137.38, elev_geoid: -4510.2, dist_total_m: 31820.4,
    RMC: '100_200', fetchedAt: '2026-04-25T12:00:00.000Z',
  },
  lastUpdated: '2026-04-25T12:00:00.000Z',
};

beforeEach(() => {
  useAppStore.setState({
    rovers: mockRovers, traverses: null, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false, stale: false,
  });
});

describe('DataDrawer', () => {
  it('renders nothing when drawerOpen is false', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: false });
    const { container } = render(<DataDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no rover is selected', () => {
    useAppStore.setState({ selectedRoverId: null, drawerOpen: true });
    const { container } = render(<DataDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('shows rover name and sol when open with a selected rover', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<DataDrawer />);
    expect(screen.getByText('Perseverance')).toBeInTheDocument();
    expect(screen.getByText(/Sol 1840/)).toBeInTheDocument();
  });

  it('shows total distance in km', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<DataDrawer />);
    // 19842.1 m / 1000 = 19.8 km
    expect(screen.getByText(/19\.8 km/)).toBeInTheDocument();
  });

  it('shows Curiosity stats when curiosity is selected', () => {
    useAppStore.setState({ selectedRoverId: 'curiosity', drawerOpen: true });
    render(<DataDrawer />);
    expect(screen.getByText('Curiosity')).toBeInTheDocument();
    expect(screen.getByText(/Sol 4868/)).toBeInTheDocument();
  });

  it('close button dispatches setDrawerOpen(false)', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<DataDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(useAppStore.getState().drawerOpen).toBe(false);
  });

  it('shows lat/lon to 4 decimal places', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<DataDrawer />);
    expect(screen.getByText('18.4300°')).toBeInTheDocument();
    expect(screen.getByText('77.2200°')).toBeInTheDocument();
  });
});
