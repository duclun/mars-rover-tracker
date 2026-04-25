import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';
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
    rovers: null, stale: false, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false,
  });
});

describe('TopBar', () => {
  it('renders the app title', () => {
    render(<TopBar />);
    expect(screen.getByText('Mars Rover Tracker')).toBeInTheDocument();
  });

  it('shows the last-updated date when rovers are loaded', () => {
    useAppStore.setState({ rovers: mockRovers });
    render(<TopBar />);
    expect(screen.getByText(/2026-04-25/)).toBeInTheDocument();
  });

  it('shows "(cached)" badge when data is stale', () => {
    useAppStore.setState({ rovers: mockRovers, stale: true });
    render(<TopBar />);
    expect(screen.getByText(/(cached)/)).toBeInTheDocument();
  });

  it('renders the NASA attribution link', () => {
    render(<TopBar />);
    const link = screen.getByRole('link', { name: /NASA\/JPL-Caltech/i });
    expect(link).toHaveAttribute('href', 'https://mars.nasa.gov/');
  });
});
