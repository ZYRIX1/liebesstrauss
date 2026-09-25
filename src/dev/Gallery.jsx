// Entwicklungs-Galerie: alle Sorten/Farben und Sträuße verschiedener Größe.
import { useState } from 'react';
import { FLOWER_TYPES, COLORS } from '../../shared/catalog.js';
import { FlowerDefs, FlowerIcon } from '../flowers/art.jsx';
import Bouquet from '../components/Bouquet.jsx';
import { setThemePref } from '../lib/theme.js';

function demoFlowers(n, openedRatio = 0.6) {
  return Array.from({ length: n }, (_, i) => ({
    id: `demo-${i}`,
    flower_type: FLOWER_TYPES[(i * 7 + 3) % FLOWER_TYPES.length].id,
    color: COLORS[(i * 5 + 1) % COLORS.length].id,
    created_at: new Date(2026, 0, 1, 0, i).toISOString(),
    opened_at: i / n < openedRatio ? '2026-01-02T00:00:00.000Z' : null,
  }));
}

export default function Gallery() {
  const [bloomingId, setBloomingId] = useState(null);
  const params = new URLSearchParams(location.search);
  const iconSize = Number(params.get('size')) || 64;
  const sizes = params.get('n') ? params.get('n').split(',').map(Number) : [0, 1, 2, 3, 5, 8, 12, 20, 35, 60];
  const only = params.get('only');
  return (
    <div className="p-4">
      <FlowerDefs />
      <div className="mb-4 flex gap-2">
        <button className="rounded-full bg-surface-2 px-4 py-2" onClick={() => setThemePref('light')}>Hell</button>
        <button className="rounded-full bg-surface-2 px-4 py-2" onClick={() => setThemePref('dark')}>Dunkel</button>
      </div>
      {only !== 'bouquets' && FLOWER_TYPES.map((t) => (
        <div key={t.id} className="mb-2">
          <div className="text-sm font-bold">{t.name}</div>
          <div className="flex flex-wrap gap-1">
            {COLORS.map((c) => <FlowerIcon key={c.id} type={t.id} color={c.id} size={iconSize} />)}
            {COLORS.slice(0, 4).map((c) => <FlowerIcon key={`b${c.id}`} type={t.id} color={c.id} size={iconSize} bud glow />)}
          </div>
        </div>
      ))}
      {only !== 'flowers' && <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {sizes.map((n) => {
          const flowers = demoFlowers(n);
          return (
            <div key={n} className="rounded-3xl bg-surface p-2 shadow-soft">
              <div className="text-center text-sm font-bold">{n} Blumen</div>
              <div className="aspect-[4/5]">
                <Bouquet
                  flowers={flowers}
                  mode={n % 2 ? 'received' : 'sent'}
                  names={{ from: 'A', to: 'B' }}
                  bloomingId={bloomingId}
                  onSelect={(f) => { setBloomingId(f.id); setTimeout(() => setBloomingId(null), 2000); }}
                />
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
