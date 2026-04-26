import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SolScrubber } from './SolScrubber';
import { useAppStore } from '../store/useAppStore';
import type { Waypoints } from '../data/types';

const mockWaypoints: Waypoints = {
  perseverance: [
    { lat: 18.43, lon: 77.22, sol: 1, distKm: 0, note: 'Landing' },
    { lat: 18.44, lon: 77.23, sol: 500, distKm: 5.0, note: 'Mid-point' },
    { lat: 18.50, lon: 77.30, sol: 1000, distKm: 10.0, note: 'Latest' },
  ],
  curiosity: [
    { lat: -4.81, lon: 137.38, sol: 1, distKm: 0, note: '' },
    { lat: -4.90, lon: 137.50, sol: 800, distKm: 8.0, note: '' },
  ],
};

beforeEach(() => {
  useAppStore.setState({
    rovers: null, traverses: null, waypoints: mockWaypoints, selectedRoverId: null,
    currentSol: 0, activeSol: null, cameraMode: 'orbit', drawerOpen: false, stale: false,
  });
});

describe('SolScrubber', () => {
  it('renders nothing when drawerOpen is false', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: false });
    const { container } = render(<SolScrubber />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no rover is selected', () => {
    useAppStore.setState({ selectedRoverId: null, drawerOpen: true });
    const { container } = render(<SolScrubber />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when waypoints are null', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true, waypoints: null });
    const { container } = render(<SolScrubber />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a range slider with correct min/max for selected rover', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<SolScrubber />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '1000');
  });

  it('dispatches setActiveSol when slider changes', () => {
    useAppStore.setState({ selectedRoverId: 'perseverance', drawerOpen: true });
    render(<SolScrubber />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '500' } });
    expect(useAppStore.getState().activeSol).toBe(500);
  });

  it('uses Curiosity sol range when curiosity is selected', () => {
    useAppStore.setState({ selectedRoverId: 'curiosity', drawerOpen: true });
    render(<SolScrubber />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '800');
  });
});
