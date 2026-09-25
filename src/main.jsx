import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { applyTheme } from './lib/theme.js';
import App from './App.jsx';

applyTheme();

// Sichtbarer Viewport (Tastatur auf dem Handy) als CSS-Variablen für Bottom-Sheets
const vv = window.visualViewport;
if (vv) {
  const update = () => {
    document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
    document.documentElement.style.setProperty('--vvt', `${vv.offsetTop}px`);
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.DEV ? '/sw.js?dev' : '/sw.js')
      .catch((err) => console.warn('Service Worker:', err));
  });
}

// Nur in der Entwicklung: Galerie aller Blumen unter /?galerie
const Gallery = import.meta.env.DEV ? lazy(() => import('./dev/Gallery.jsx')) : null;
const showGallery = Gallery && new URLSearchParams(location.search).has('galerie');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {showGallery ? <Suspense><Gallery /></Suspense> : <App />}
  </StrictMode>,
);
