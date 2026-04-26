import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileFallback } from './MobileFallback';
import { useAppStore } from '../store/useAppStore';
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
    rovers: mockRovers, traverses: null, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false, stale: false,
  });
});

describe('MobileFallback', () => {
  it('renders the app title', () => {
    render(<MobileFallback />);
    expect(screen.getByText('Mars Rover Tracker')).toBeInTheDocument();
  });

  it('shows the desktop prompt message', () => {
    render(<MobileFallback />);
    expect(screen.getByText(/desktop/i)).toBeInTheDocument();
  });

  it('renders both rover picker chips', () => {
    render(<MobileFallback />);
    expect(screen.getByText('Perseverance')).toBeInTheDocument();
    expect(screen.getByText('Curiosity')).toBeInTheDocument();
  });

  it('renders the NASA attribution link', () => {
    render(<MobileFallback />);
    expect(screen.getByRole('link', { name: /NASA\/JPL-Caltech/i })).toBeInTheDocument();
  });
});
