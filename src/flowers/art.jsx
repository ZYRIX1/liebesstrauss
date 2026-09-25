// Handgebaute SVG-Blumen. Jede Blüte liegt in einem lokalen Koordinatensystem
// mit Mittelpunkt (0,0) und passt in einen Kreis mit Radius ~48.
import { COLORS, colorById } from '../../shared/catalog.js';

const GOLD = '#F2C04E';
const GOLD_DARK = '#D0922A';

/** Einmal global eingebundene Farbverläufe, auf die alle Blumen verweisen. */
export function FlowerDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {COLORS.map((c) => (
          <g key={c.id}>
            <linearGradient id={`lg-${c.id}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={c.dark} />
              <stop offset="0.5" stopColor={c.base} />
              <stop offset="1" stopColor={c.light} />
            </linearGradient>
            <linearGradient id={`ls-${c.id}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={c.base} />
              <stop offset="1" stopColor={c.light} />
            </linearGradient>
            <linearGradient id={`bud-${c.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={c.light} />
              <stop offset="0.55" stopColor={c.base} />
              <stop offset="1" stopColor={c.dark} />
            </linearGradient>
            <radialGradient id={`glow-${c.id}`}>
              <stop offset="0" stopColor={c.light} stopOpacity="0.95" />
              <stop offset="0.55" stopColor={c.base} stopOpacity="0.35" />
              <stop offset="1" stopColor={c.base} stopOpacity="0" />
            </radialGradient>
          </g>
        ))}
        <linearGradient id="leaf-g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--leaf-dark)' }} />
          <stop offset="1" style={{ stopColor: 'var(--leaf)' }} />
        </linearGradient>
        <linearGradient id="sepal-g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--stem-dark)' }} />
          <stop offset="1" style={{ stopColor: 'var(--leaf)' }} />
        </linearGradient>
        <radialGradient id="gold-g" cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="1" stopColor={GOLD} />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ---------- Blütenblatt-Formen (Basis bei 0,0, Spitze bei 0,-len) ----------

const roundPetal = (len, w) =>
  `M0,0 C${-w * 1.2},${-len * 0.25} ${-w * 1.05},${-len * 0.95} 0,${-len} C${w * 1.05},${-len * 0.95} ${w * 1.2},${-len * 0.25} 0,0Z`;

const ruffledPetal = (len, w) =>
  `M0,0 C${-w * 1.3},${-len * 0.2} ${-w * 1.25},${-len * 0.86} ${-w * 0.5},${-len * 0.97} ` +
  `Q${-w * 0.25},${-len * 0.88} 0,${-len} Q${w * 0.25},${-len * 0.88} ${w * 0.5},${-len * 0.97} ` +
  `C${w * 1.25},${-len * 0.86} ${w * 1.3},${-len * 0.2} 0,0Z`;

const pointedPetal = (len, w) =>
  `M0,0 C${-w},${-len * 0.3} ${-w * 0.55},${-len * 0.72} 0,${-len} C${w * 0.55},${-len * 0.72} ${w},${-len * 0.3} 0,0Z`;

function Ring({ n, len, w, shape, offset = 0, d = 0, r, fill, edge, startAt = 0 }) {
  const path = shape(len, w);
  return (
    <g className="layer" style={{ '--d': d, ...(r !== undefined && { '--r': r }) }}>
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={path}
          transform={`rotate(${offset + (i * 360) / n})${startAt ? ` translate(0,${-startAt})` : ''}`}
          fill={fill}
          {...edge}
        />
      ))}
    </g>
  );
}

const edgeFor = (c, strength = 1) => ({
  stroke: c.dark,
  strokeWidth: 1,
  strokeOpacity: (c.id === 'creme' ? 0.9 : 0.45) * strength,
  strokeLinejoin: 'round',
});

// ---------- Blüten ----------

function RoseBloom({ c }) {
  const edge = edgeFor(c);
  return (
    <>
      <Ring d={0} n={5} len={47} w={25} shape={roundPetal} fill={`url(#lg-${c.id})`} edge={edge} />
      <Ring d={1} n={5} len={36} w={20} shape={roundPetal} offset={36} fill={`url(#ls-${c.id})`} edge={edge} />
      <g className="layer" style={{ '--d': 2, '--r': '-90deg' }}>
        {[[22, 3, 0], [17.5, 3, 125], [13.5, 2.4, 250], [10, 2, 15], [6.5, 1.4, 140]].map(([rad, off, deg], i) => {
          const a = (deg * Math.PI) / 180;
          return (
            <g key={i}>
              <circle cx={Math.cos(a) * off} cy={Math.sin(a) * off} r={rad} fill={i % 2 ? c.base : `url(#lg-${c.id})`} {...edge} />
              <path
                d={`M${Math.cos(a + 2.4) * rad},${Math.sin(a + 2.4) * rad} A${rad},${rad} 0 0 1 ${Math.cos(a + 4.6) * rad},${Math.sin(a + 4.6) * rad}`}
                transform={`translate(${Math.cos(a) * off},${Math.sin(a) * off})`}
                fill="none" stroke={c.light} strokeWidth="1.6" strokeLinecap="round" opacity="0.85"
              />
            </g>
          );
        })}
        <path d="M-2,-1 C-2,-4 3,-4 3,0 C3,3 -2,4 -4,1" fill="none" stroke={c.dark} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </>
  );
}

function TulipBloom({ c }) {
  const edge = edgeFor(c);
  return (
    <g transform="translate(0,4)">
      <g className="layer" style={{ '--d': 0, '--r': '0deg' }}>
        <path d="M-15,14 C-23,-4 -17,-33 0,-44 C17,-33 23,-4 15,14Z" fill={`url(#lg-${c.id})`} {...edge} />
      </g>
      <g className="layer" style={{ '--d': 1, '--r': '-12deg' }}>
        <path d="M5,24 C-19,24 -32,7 -32,-14 C-32,-27 -28,-37 -23,-42 C-14,-31 -4,-22 2,-8 C6,4 7,15 5,24Z" fill={`url(#lg-${c.id})`} {...edge} />
      </g>
      <g className="layer" style={{ '--d': 1, '--r': '12deg' }}>
        <path d="M-5,24 C19,24 32,7 32,-14 C32,-27 28,-37 23,-42 C14,-31 4,-22 -2,-8 C-6,4 -7,15 -5,24Z" fill={`url(#lg-${c.id})`} {...edge} />
      </g>
      <g className="layer" style={{ '--d': 2, '--r': '0deg' }}>
        <path d="M0,25 C-15,23 -21,6 -19,-12 C-17,-27 -8,-35 0,-39 C8,-35 17,-27 19,-12 C21,6 15,23 0,25Z" fill={`url(#ls-${c.id})`} {...edge} />
        <path d="M0,20 C-2,6 -2,-14 0,-31" fill="none" stroke={c.light} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <path d="M-8,16 C-12,4 -12,-12 -7,-24" fill="none" stroke={c.dark} strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
      </g>
    </g>
  );
}

function DaisyBloom({ c }) {
  const edge = edgeFor(c, 0.7);
  const center = c.id === 'butter' ? '#B9692C' : 'url(#gold-g)';
  const centerRing = c.id === 'butter' ? '#8E4E1E' : GOLD_DARK;
  return (
    <>
      <g className="layer" style={{ '--d': 0 }}>
        {Array.from({ length: 16 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-27" rx="6.4" ry="19.5" transform={`rotate(${i * 22.5})`} fill={c.base} {...edge} />
        ))}
      </g>
      <g className="layer" style={{ '--d': 1 }}>
        {Array.from({ length: 16 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-22" rx="5.4" ry="15.5" transform={`rotate(${11.25 + i * 22.5})`} fill={c.light} {...edge} />
        ))}
      </g>
      <g className="layer" style={{ '--d': 2 }}>
        <circle r="13" fill={center} stroke={centerRing} strokeWidth="2" />
        {[[-4, -5], [3, -6], [6, 1], [0, 1], [-6, 3], [2, 7], [-2, -1]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.3" fill={centerRing} opacity="0.55" />
        ))}
      </g>
    </>
  );
}

function LilyBloom({ c }) {
  const edge = edgeFor(c);
  const speckles = [[-3, -14], [3, -18], [-2, -22], [2, -11]];
  const petal = (angle, len, fill) => (
    <g key={angle} transform={`rotate(${angle})`}>
      <path d={pointedPetal(len, 15)} fill={fill} {...edge} />
      <path d={`M0,-4 C-1,-${len * 0.4} 1,-${len * 0.7} 0,-${len * 0.92}`} fill="none" stroke={c.light} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      {speckles.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.2" fill={c.dark} opacity="0.8" />)}
    </g>
  );
  return (
    <>
      <g className="layer" style={{ '--d': 0 }}>{[30, 150, 270].map((a) => petal(a, 44, `url(#lg-${c.id})`))}</g>
      <g className="layer" style={{ '--d': 1 }}>{[90, 210, 330].map((a) => petal(a, 47, `url(#ls-${c.id})`))}</g>
      <g className="layer" style={{ '--d': 2 }}>
        <circle r="8" fill="#DDE9BD" opacity="0.9" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <g key={a} transform={`rotate(${a + 15})`}>
            <path d="M0,0 C2,-8 -1,-15 1,-21" fill="none" stroke="#A9BE7E" strokeWidth="1.3" strokeLinecap="round" />
            <ellipse cx="1" cy="-22.5" rx="1.9" ry="3.6" fill="#B35A32" />
          </g>
        ))}
        <circle r="2.6" fill="#C9DB98" />
      </g>
    </>
  );
}

function PeonyBloom({ c }) {
  const edge = edgeFor(c);
  return (
    <>
      <Ring d={0} n={7} len={46} w={22} shape={ruffledPetal} fill={`url(#lg-${c.id})`} edge={edge} />
      <Ring d={1} n={7} len={35} w={18} shape={ruffledPetal} offset={25} fill={`url(#ls-${c.id})`} edge={edge} />
      <Ring d={2} n={6} len={23} w={13} shape={ruffledPetal} offset={10} fill={`url(#lg-${c.id})`} edge={edge} />
      <g className="layer" style={{ '--d': 3 }}>
        <circle r="10" fill={c.light} {...edge} />
        <path d="M-8,3 C-7,-7 7,-7 8,3" fill="none" stroke={c.dark} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <path d="M-5,-2 C-3,-8 4,-7 5,-1" fill="none" stroke={c.dark} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
        <path d="M-6,6 C-2,2 3,2 6,6" fill="none" stroke={c.base} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </>
  );
}

function Floret({ x, y, c, rot = 0 }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx="0" cy="-6.4" r="6.6" transform={`rotate(${a})`} fill={`url(#ls-${c.id})`} {...edgeFor(c, 0.8)} />
      ))}
      <circle r="3.6" fill="#FFF7DC" />
      <circle r="1.8" fill={GOLD} />
    </g>
  );
}

function ForgetMeNotBloom({ c }) {
  const ring = [0, 60, 120, 180, 240, 300].map((a, i) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: Math.cos(rad) * 24, y: Math.sin(rad) * 24, rot: i * 23 };
  });
  const buds = [[-36, -20], [37, -14], [-10, 38], [22, 34]];
  return (
    <>
      <g className="layer" style={{ '--d': 0 }}>
        {buds.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={c.light} stroke={c.dark} strokeOpacity="0.4" />)}
      </g>
      <g className="layer" style={{ '--d': 1 }}>
        {ring.map((p, i) => <Floret key={i} {...p} c={c} />)}
      </g>
      <g className="layer" style={{ '--d': 2 }}>
        <Floret x={0} y={0} rot={18} c={c} />
      </g>
    </>
  );
}

// ---------- Knospen (geschlossen) ----------

function Sepals({ spread = 1, y = 18 }) {
  return (
    <g fill="url(#sepal-g)">
      <path d={`M0,${y} C${-10 * spread},${y - 1} ${-18 * spread},${y - 9} ${-19 * spread},${y - 22} C${-12 * spread},${y - 14} ${-6 * spread},${y - 9} 0,${y - 7}Z`} />
      <path d={`M0,${y} C${10 * spread},${y - 1} ${18 * spread},${y - 9} ${19 * spread},${y - 22} C${12 * spread},${y - 14} ${6 * spread},${y - 9} 0,${y - 7}Z`} />
      <ellipse cx="0" cy={y + 3} rx="6" ry="5" />
    </g>
  );
}

function RoseBud({ c }) {
  return (
    <>
      <path d="M0,-32 C15,-27 20,-8 17,6 C14,16 7,21 0,21 C-7,21 -14,16 -17,6 C-20,-8 -15,-27 0,-32Z" fill={`url(#bud-${c.id})`} {...edgeFor(c)} />
      <path d="M3,-31 C17,-22 19,-3 12,10 C8,16 2,19 -5,20 C6,10 9,-9 3,-31Z" fill={c.dark} opacity="0.45" />
      <path d="M-6,-24 C-2,-29 5,-29 8,-25" fill="none" stroke={c.dark} strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <Sepals />
    </>
  );
}

function TulipBud({ c }) {
  return (
    <>
      <path d="M0,-35 C13,-27 16,-6 14,8 C12,18 6,22 0,22 C-6,22 -12,18 -14,8 C-16,-6 -13,-27 0,-35Z" fill={`url(#bud-${c.id})`} {...edgeFor(c)} />
      <path d="M0,-35 C5,-18 6,2 3,21" fill="none" stroke={c.dark} strokeWidth="1.6" opacity="0.55" />
      <path d="M-4,-24 C-8,-12 -8,4 -6,16" fill="none" stroke={c.light} strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="0" cy="23" rx="5" ry="3.5" fill="url(#sepal-g)" />
    </>
  );
}

function DaisyBud({ c }) {
  return (
    <>
      {[-50, -25, 0, 25, 50].map((a) => (
        <ellipse key={a} cx="0" cy="-14" rx="4.5" ry="10" transform={`rotate(${a})`} fill={c.base} {...edgeFor(c, 0.7)} />
      ))}
      <circle cy="3" r="16" fill="url(#sepal-g)" />
      {[-40, -15, 15, 40].map((a) => (
        <path key={a} d="M0,-13 L3,-4 L-3,-4Z" transform={`translate(0,3) rotate(${a})`} fill="var(--leaf)" opacity="0.8" />
      ))}
    </>
  );
}

function LilyBud({ c }) {
  return (
    <g transform="rotate(8)">
      <path d="M0,-40 C8,-31 12,-10 11,6 C10,16 6,22 0,22 C-6,22 -10,16 -11,6 C-12,-10 -8,-31 0,-40Z" fill={`url(#bud-${c.id})`} {...edgeFor(c)} />
      <path d="M0,-38 C3,-20 3,0 1,20" fill="none" stroke={c.dark} strokeWidth="1.4" opacity="0.5" />
      <path d="M-6,-20 C-8,-8 -8,6 -6,16" fill="none" stroke={c.light} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M-11,6 C-10,16 -6,22 0,22 C6,22 10,16 11,6 C6,12 -6,12 -11,6Z" fill="var(--leaf)" opacity="0.55" />
    </g>
  );
}

function PeonyBud({ c }) {
  return (
    <>
      <circle cy="-4" r="19" fill={`url(#bud-${c.id})`} {...edgeFor(c)} />
      <path d="M-10,-16 C-4,-22 6,-21 11,-13" fill="none" stroke={c.dark} strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path d="M-13,-4 C-8,-12 4,-14 12,-6" fill="none" stroke={c.dark} strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
      <Sepals spread={1.05} y={19} />
    </>
  );
}

function ForgetMeNotBud({ c }) {
  const pts = [[0, -16, 6], [-10, -6, 5.5], [10, -7, 5.5], [-5, 6, 5], [6, 5, 5], [0, -3, 5]];
  return (
    <>
      <path d="M0,22 C0,12 -2,4 0,-6" fill="none" stroke="var(--stem)" strokeWidth="3" strokeLinecap="round" />
      {pts.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y + 4} r={r * 0.75} fill="url(#sepal-g)" />
          <circle cx={x} cy={y} r={r} fill={`url(#bud-${c.id})`} {...edgeFor(c, 0.8)} />
        </g>
      ))}
    </>
  );
}

const BLOOMS = { rose: RoseBloom, tulip: TulipBloom, daisy: DaisyBloom, lily: LilyBloom, peony: PeonyBloom, forgetmenot: ForgetMeNotBloom };
const BUDS = { rose: RoseBud, tulip: TulipBud, daisy: DaisyBud, lily: LilyBud, peony: PeonyBud, forgetmenot: ForgetMeNotBud };

const SPARKLE = 'M0,-5 L1.2,-1.2 L5,0 L1.2,1.2 L0,5 L-1.2,1.2 L-5,0 L-1.2,-1.2Z';

export function Bloom({ type, color, blooming = false }) {
  const Comp = BLOOMS[type] ?? RoseBloom;
  return <g className={blooming ? 'blooming' : undefined}><Comp c={colorById(color)} /></g>;
}

export function Bud({ type, color, glow = false, delay = 0 }) {
  const Comp = BUDS[type] ?? RoseBud;
  const c = colorById(color);
  return (
    <g>
      {glow && <circle className="bud-glow" r="36" cy="-4" fill={`url(#glow-${c.id})`} style={{ '--glow-delay': `${delay}s` }} />}
      <g className={glow ? 'bud-breathe' : undefined} style={{ '--glow-delay': `${delay}s` }}>
        <g transform="scale(1.28)"><Comp c={c} /></g>
      </g>
      {glow && (
        <g fill="#FFFFFF">
          <path d={SPARKLE} className="twinkle" transform="translate(19,-26)" style={{ '--tw-delay': `${delay + 0.4}s` }} />
          <path d={SPARKLE} className="twinkle" transform="translate(-20,-12) scale(0.7)" style={{ '--tw-delay': `${delay + 1.3}s` }} />
        </g>
      )}
    </g>
  );
}

export function CheckBadge() {
  return (
    <g transform="translate(31,-31)">
      <circle r="10" fill="var(--check)" stroke="var(--surface)" strokeWidth="3" />
      <path d="M-4.5,0.5 L-1.3,3.6 L4.6,-3.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** Funkelnde Partikel beim Aufblühen. */
export function Burst({ color }) {
  const c = colorById(color);
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const dist = 58 + (i % 3) * 10;
        return (
          <path
            key={i}
            d={i % 2 ? SPARKLE : 'M0,-3.2 A3.2,3.2 0 1 1 0,3.2 A3.2,3.2 0 1 1 0,-3.2Z'}
            className="burst-dot"
            fill={i % 3 === 0 ? GOLD : i % 3 === 1 ? c.base : '#FFFFFF'}
            style={{ '--tx': `${Math.cos(a) * dist}px`, '--ty': `${Math.sin(a) * dist}px` }}
          />
        );
      })}
    </g>
  );
}

/** Einzelne Blume als eigenständiges SVG (Auswahl, Liste, Karte). */
export function FlowerIcon({ type, color, bud = false, size = 48, className, glow = false }) {
  return (
    <svg viewBox="-54 -54 108 108" width={size} height={size} className={className} aria-hidden="true" style={{ overflow: 'visible' }}>
      {bud ? <Bud type={type} color={color} glow={glow} /> : <Bloom type={type} color={color} />}
    </svg>
  );
}
