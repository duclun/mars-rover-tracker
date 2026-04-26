import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { DataLoader } from './DataLoader';
import { useAppStore } from '../store/useAppStore';

afterEach(() => {
  useAppStore.setState({
    rovers: null, stale: false, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false,
    traverses: null, waypoints: null, activeSol: null,
  });
  vi.restoreAllMocks();
});

describe('DataLoader', () => {
  it('renders nothing (returns null)', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const { container } = render(<DataLoader />);
    expect(container.firstChild).toBeNull();
  });

  it('falls back to bundled snapshot when fetch returns non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<DataLoader />);
    await vi.waitFor(() => {
      const { rovers, stale } = useAppStore.getState();
      expect(rovers).not.toBeNull();
      expect(stale).toBe(true);
    });
  });

  it('falls back to bundled snapshot when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<DataLoader />);
    await vi.waitFor(() => {
      const { stale } = useAppStore.getState();
      expect(stale).toBe(true);
    });
  });
});

describe('DataLoader -- traverses', () => {
  it('sets traverses when both traverse files load successfully', async () => {
    const mockTraverseP: [number, number][] = [[18.43, 77.22]];
    const mockTraverseC: [number, number][] = [[-4.81, 137.38]];

    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/data/rovers.json') {
        return Promise.resolve({ ok: false, status: 500 }); // use snapshot
      }
      if (url === '/data/traverses/perseverance.json') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTraverseP) });
      }
      if (url === '/data/traverses/curiosity.json') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTraverseC) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }));

    render(<DataLoader />);

    await vi.waitFor(() => {
      const { traverses } = useAppStore.getState();
      expect(traverses?.perseverance).toHaveLength(1);
      expect(traverses?.curiosity).toHaveLength(1);
    });
  });

  it('leaves traverses null when traverse fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/data/rovers.json') return Promise.resolve({ ok: false, status: 500 });
      return Promise.reject(new Error('network error'));
    }));

    render(<DataLoader />);

    await vi.waitFor(() => {
      // rovers fallback must have loaded (stale)
      expect(useAppStore.getState().stale).toBe(true);
    });
    expect(useAppStore.getState().traverses).toBeNull();
  });
});

describe('DataLoader -- waypoints', () => {
  it('sets waypoints when both waypoint files load successfully', async () => {
    const mockWaypointsP = [{ lat: 18.43, lon: 77.22, sol: 100, distKm: 0.5, note: 'Stop' }];
    const mockWaypointsC = [{ lat: -4.81, lon: 137.38, sol: 50, distKm: 0.2, note: '' }];

    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/data/rovers.json') return Promise.resolve({ ok: false, status: 500 });
      if (url === '/data/traverses/perseverance.json') return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url === '/data/traverses/curiosity.json') return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url === '/data/waypoints/perseverance.json') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockWaypointsP) });
      if (url === '/data/waypoints/curiosity.json') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockWaypointsC) });
      return Promise.resolve({ ok: false, status: 404 });
    }));

    render(<DataLoader />);

    await vi.waitFor(() => {
      const { waypoints } = useAppStore.getState();
      expect(waypoints?.perseverance).toHaveLength(1);
      expect(waypoints?.curiosity).toHaveLength(1);
    });
  });

  it('leaves waypoints null when waypoint fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/data/rovers.json') return Promise.resolve({ ok: false, status: 500 });
      if (url.includes('/data/traverses/')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.reject(new Error('network error'));
    }));

    render(<DataLoader />);

    await vi.waitFor(() => {
      expect(useAppStore.getState().stale).toBe(true);
    });
    expect(useAppStore.getState().waypoints).toBeNull();
  });
});
