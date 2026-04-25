import { DataLoader } from './data/DataLoader';
import { Scene } from './scene/Scene';
import { TopBar } from './ui/TopBar';

export function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <DataLoader />
      <Scene />
      <TopBar />
    </div>
  );
}
