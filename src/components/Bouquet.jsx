import { memo, useMemo } from 'react';
import { layoutBouquet } from '../flowers/layout.js';
import { Bloom, Bud, Burst, CheckBadge } from '../flowers/art.jsx';
import { typeById, unopenedLabel } from '../../shared/catalog.js';

const VIEW_W = 400;
const VIEW_H = 500;

const leafPath = (s) =>
  `M0,0 C${s * 0.34},${-s * 0.22} ${s * 0.32},${-s * 0.72} 0,${-s} C${-s * 0.32},${-s * 0.72} ${-s * 0.34},${-s * 0.22} 0,0Z`;

function Greenery({ leaves, fillers }) {
  return (
    <>
      {fillers.map((f, i) => (
        <g key={`f${i}`} transform={`translate(${f.x.toFixed(1)},${f.y.toFixed(1)}) rotate(${f.rot.toFixed(1)})`}>
          <path d={`M0,0 L0,${-f.size * 0.9} M0,${-f.size * 0.5} L${f.size * 0.18},${-f.size * 0.82} M0,${-f.size * 0.6} L${-f.size * 0.2},${-f.size * 0.86}`} stroke="var(--stem)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          {[[0, -0.95, 3], [0.2, -0.86, 2.6], [-0.22, -0.9, 2.6], [0.1, -1.05, 2.2], [-0.08, -0.78, 2.2]].map(([x, y, r], j) => (
            <circle key={j} cx={x * f.size} cy={y * f.size} r={r} fill="var(--filler)" stroke="var(--wrap-edge)" strokeWidth="0.6" />
          ))}
        </g>
      ))}
      {leaves.map((l, i) => (
        <g key={`l${i}`} transform={`translate(${l.x.toFixed(1)},${l.y.toFixed(1)}) rotate(${l.rot.toFixed(1)})`}>
          <path d={leafPath(l.size)} fill="url(#leaf-g)" />
          <path d={`M0,-2 Q${l.size * 0.05},${-l.size * 0.5} 0,${-l.size * 0.92}`} stroke="var(--leaf-dark)" strokeWidth="1.2" fill="none" opacity="0.7" />
        </g>
      ))}
    </>
  );
}

function Wrap({ wrap, children }) {
  return (
    <>
      <path d={wrap.back} fill="var(--wrap-back)" stroke="var(--wrap-edge)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={wrap.backFold} fill="none" stroke="var(--wrap-edge)" strokeWidth="1" opacity="0.6" />
      {children}
    </>
  );
}

function WrapFront({ wrap, bow }) {
  const t = wrap.tailY;
  return (
    <>
      {[-7, 0, 7].map((x, i) => (
        <path key={i} d={`M${x},${t * 0.6} L${x * 1.3 + (i - 1) * 2},${t + 16}`} stroke="var(--stem)" strokeWidth="4.5" strokeLinecap="round" />
      ))}
      <path d={wrap.tail} fill="var(--wrap-shade)" stroke="var(--wrap-edge)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={wrap.right} fill="var(--wrap-shade)" stroke="var(--wrap-edge)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={wrap.left} fill="var(--wrap)" stroke="var(--wrap-edge)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={wrap.leftFold} fill="none" stroke="var(--wrap-edge)" strokeWidth="1" opacity="0.7" />
      <g transform={`scale(${bow})`}>
        <rect x="-15" y="-4.5" width="30" height="9" rx="4" fill="var(--ribbon)" />
        <path d="M-2,-1 C-12,-16 -32,-15 -32,-3 C-32,9 -14,7 -2,1Z" fill="var(--ribbon)" stroke="var(--ribbon-dark)" strokeWidth="1.2" />
        <path d="M2,-1 C12,-16 32,-15 32,-3 C32,9 14,7 2,1Z" fill="var(--ribbon)" stroke="var(--ribbon-dark)" strokeWidth="1.2" />
        <path d="M-22,-4 C-16,-9 -9,-7 -5,-2" fill="none" stroke="var(--ribbon-dark)" strokeWidth="1" opacity="0.6" />
        <path d="M22,-4 C16,-9 9,-7 5,-2" fill="none" stroke="var(--ribbon-dark)" strokeWidth="1" opacity="0.6" />
        <path d="M-3,3 C-7,14 -12,24 -19,33 L-10,34 C-6,25 -2,15 2,4Z" fill="var(--ribbon)" stroke="var(--ribbon-dark)" strokeWidth="1.1" />
        <path d="M3,3 C7,14 13,23 21,31 L12,34 C7,25 3,15 -1,4Z" fill="var(--ribbon)" stroke="var(--ribbon-dark)" strokeWidth="1.1" />
        <ellipse rx="6.5" ry="5.5" fill="var(--ribbon)" stroke="var(--ribbon-dark)" strokeWidth="1.2" />
      </g>
    </>
  );
}

function headLabel(f, mode, names) {
  const t = typeById(f.flower_type);
  if (mode === 'received') return f.opened_at ? `${t.name} von ${names.from} – geöffnet` : `${unopenedLabel(t)} von ${names.from} – antippen zum Öffnen`;
  return f.opened_at ? `${t.name} für ${names.to} – wurde geöffnet` : `${t.name} für ${names.to} – noch nicht geöffnet`;
}

/**
 * Der illustrierte Strauß.
 * mode: 'received' (Knospen schimmern, Antippen öffnet) | 'sent' (Häkchen bei geöffneten)
 */
function Bouquet({ flowers, mode, names, onSelect, bloomingId, hiddenId, arrivedId, wiggleId, label, preview = false }) {
  const layout = useMemo(() => layoutBouquet(flowers), [flowers]);
  const { bounds } = layout;
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  const k = Math.min((VIEW_W * 0.97) / bw, (VIEW_H * 0.97) / bh, flowers.length ? 1.45 : 1.05);
  const tx = VIEW_W / 2 - ((bounds.minX + bounds.maxX) / 2) * k;
  const ty = VIEW_H / 2 - ((bounds.minY + bounds.maxY) / 2) * k;

  const activate = (f) => onSelect?.(f);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block h-full w-full select-none" role="group" aria-label={label} style={{ overflow: 'visible' }}>
      <g style={{ transform: `translate(${tx}px, ${ty}px) scale(${k})`, transition: 'transform 0.9s cubic-bezier(.3,.8,.3,1)' }}>
        <g className="bouquet-sway">
          <Wrap wrap={layout.wrap}>
            <Greenery leaves={layout.leaves} fillers={layout.fillers} />
            {layout.stems.map((s) => (
              <path key={s.id} d={s.d} fill="none" stroke="var(--stem)" strokeWidth={Math.max(2.2, layout.r * 0.11)} strokeLinecap="round" opacity={s.id === hiddenId ? 0 : 1} />
            ))}
          </Wrap>
          <WrapFront wrap={layout.wrap} bow={layout.bow} />

          {layout.heads.map((h) => {
            const f = h.flower;
            const sealed = !f.opened_at;
            const blooming = f.id === bloomingId;
            const interactive = !!onSelect && !preview;
            return (
              <g
                key={f.id}
                data-flower-id={f.id}
                transform={`translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.rot.toFixed(1)}) scale(${h.scale.toFixed(3)})`}
                opacity={f.id === hiddenId ? 0 : 1}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? headLabel(f, mode, names) : undefined}
                onClick={interactive ? () => activate(f) : undefined}
                onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(f); } } : undefined}
                style={{ cursor: interactive ? 'pointer' : undefined, outline: 'none' }}
              >
                <g
                  className="head-sway"
                  style={{ '--sway-dur': `${h.swayDur.toFixed(2)}s`, '--sway-delay': `${h.swayDelay.toFixed(2)}s`, '--sway-amp': `${h.swayAmp.toFixed(1)}deg` }}
                >
                  <g className={f.id === arrivedId ? 'arrive' : f.id === wiggleId ? 'wiggle' : undefined}>
                    {blooming ? (
                      <>
                        <g className="bud-out"><Bud type={f.flower_type} color={f.color} /></g>
                        <Bloom type={f.flower_type} color={f.color} blooming />
                        <Burst color={f.color} />
                      </>
                    ) : sealed ? (
                      <Bud type={f.flower_type} color={f.color} glow={mode === 'received'} delay={h.glowDelay} />
                    ) : (
                      <Bloom type={f.flower_type} color={f.color} />
                    )}
                    {mode === 'sent' && !sealed && <CheckBadge />}
                  </g>
                </g>
                <circle className="hit" r="50" fill="transparent" />
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}

export default memo(Bouquet);
