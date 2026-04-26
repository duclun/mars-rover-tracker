import { useState, useEffect } from 'react';
import { DataLoader } from './data/DataLoader';
import { Scene } from './scene/Scene';
import { TopBar } from './ui/TopBar';
import { RoverPicker } from './ui/RoverPicker';
import { DataDrawer } from './ui/DataDrawer';
import { MobileFallback } from './ui/MobileFallback';

function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px), (pointer: coarse)').matches);
  }, []);
  return isMobile;
}

export function App() {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <>
        <DataLoader />
        <MobileFallback />
      </>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <DataLoader />
      <Scene />
      <TopBar />
      <RoverPicker />
      <DataDrawer />
    </div>
  );
}
