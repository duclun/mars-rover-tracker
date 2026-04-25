import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { DataLoader } from './DataLoader';
import { useAppStore } from '../store/useAppStore';

afterEach(() => {
  useAppStore.setState({
    rovers: null, stale: false, selectedRoverId: null,
    currentSol: 0, cameraMode: 'orbit', drawerOpen: false,
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
