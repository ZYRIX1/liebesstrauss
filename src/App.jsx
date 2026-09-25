import { useEffect, useMemo } from 'react';
import { useStore } from './lib/store.js';
import { resyncPush } from './lib/push.js';
import { FlowerDefs } from './flowers/art.jsx';
import Home from './components/Home.jsx';
import Onboarding from './components/Onboarding.jsx';
import { Button, ToastProvider } from './components/ui.jsx';
import { IconBouquet } from './components/icons.jsx';

function Splash({ offline, onRetry }) {
  return (
    <div className="grid min-h-dvh place-items-center p-8 text-center">
      <div className="fade-in">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-rose-soft text-rose-strong">
          <IconBouquet size={32} />
        </span>
        <p className="mt-4 font-display text-3xl font-semibold italic">Liebesstrauß</p>
        {offline ? (
          <>
            <p className="mt-3 text-muted">Keine Verbindung zum Server. Bist du online?</p>
            <Button variant="soft" onClick={onRetry} className="mt-6">Nochmal versuchen</Button>
          </>
        ) : (
          <p className="shimmer-text mt-2 font-semibold">Blumen werden gebunden …</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const store = useStore();
  const joinCode = useMemo(() => location.pathname.match(/^\/join\/([A-Za-z0-9-]{4,16})/)?.[1] ?? null, []);

  useEffect(() => {
    if (store.status !== 'ready') return;
    if (location.pathname !== '/') history.replaceState(null, '', '/');
    resyncPush();
  }, [store.status]);

  return (
    <ToastProvider>
      <FlowerDefs />
      {store.status === 'ready' ? (
        <Home store={store} />
      ) : store.status === 'guest' ? (
        <Onboarding initialCode={joinCode} onAuthed={store.signIn} />
      ) : (
        <Splash offline={store.status === 'offline'} onRetry={store.refresh} />
      )}
    </ToastProvider>
  );
}
