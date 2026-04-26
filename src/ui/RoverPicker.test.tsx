import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoverPicker } from './RoverPicker';
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

describe('RoverPicker', () => {
  it('renders both rover chips', () => {
    render(<RoverPicker />);
    expect(screen.getByText('Perseverance')).toBeInTheDocument();
    expect(screen.getByText('Curiosity')).toBeInTheDocument();
  });

  it('clicking a chip calls selectRover and opens drawer', () => {
    render(<RoverPicker />);
    fireEvent.click(screen.getByText('Perseverance'));
    expect(useAppStore.getState().selectedRoverId).toBe('perseverance');
    expect(useAppStore.getState().drawerOpen).toBe(true);
  });

  it('clicking a different chip switches selection', () => {
    render(<RoverPicker />);
    fireEvent.click(screen.getByText('Curiosity'));
    expect(useAppStore.getState().selectedRoverId).toBe('curiosity');
  });

  it('selected chip has aria-pressed=true', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance' });
    render(<RoverPicker />);
    expect(screen.getByText('Perseverance').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Curiosity').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });
});
