// Ordnet die Blüten zu einer gewölbten Strauß-Kuppel an (Vogel-Spirale, damit
// sich nichts unschön überlappt) und berechnet Papier, Stiele und Grün dazu.

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SQUASH = 0.84; // Kuppel ist breiter als hoch
const SIDE_VIEW = new Set(['tulip']);

/**
 * @param {Array<{id:string, flower_type:string}>} flowers – älteste zuerst (landen in der Mitte)
 * Koordinaten: Bindestelle des Straußes liegt bei (0,0), y wächst nach unten.
 */
export function layoutBouquet(flowers) {
  const n = flowers.length;
  // Feste Kopfgröße: Der Strauß wächst, die Ansicht zoomt heraus (siehe Bouquet.jsx).
  const r = 44;
  const spacing = r * 0.98;

  let pts = flowers.map((f, i) => {
    const rand = seededRandom(hashString(f.id));
    const dist = spacing * Math.sqrt(i + 0.5);
    const angle = i * GOLDEN_ANGLE - Math.PI / 2;
    const jitter = r * 0.2;
    return {
      flower: f,
      x: Math.cos(angle) * dist + (rand() - 0.5) * jitter,
      y: Math.sin(angle) * dist + (rand() - 0.5) * jitter,
      rot: (rand() - 0.5) * (SIDE_VIEW.has(f.flower_type) ? 16 : 44),
      swayDur: 4.2 + rand() * 2.6,
      swayDelay: -rand() * 6,
      swayAmp: 1.6 + rand() * 2.2,
      glowDelay: -rand() * 2.6,
    };
  });

  // Schwerpunkt in die Mitte holen, damit auch 1–3 Blumen mittig sitzen.
  if (n) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / n;
    const cy = pts.reduce((s, p) => s + p.y, 0) / n;
    pts = pts.map((p) => ({ ...p, x: p.x - cx, y: (p.y - cy) * SQUASH }));
  }

  const R = n ? Math.max(...pts.map((p) => Math.hypot(p.x, p.y / SQUASH))) + r : 0;
  const S = Math.max(R, 74); // Grundmaß für Papier & Schleife
  const Ry = R * SQUASH;
  const domeY = -(S * 1.0 + 24); // Mittelpunkt der Kuppel über der Bindestelle

  const heads = pts
    .map((p) => {
      const depth = Ry ? p.y / Ry : 0; // -1 oben (hinten) … +1 unten (vorne)
      return { ...p, x: p.x, y: p.y + domeY, scale: (r / 43) * (1 + depth * 0.06) };
    })
    .sort((a, b) => a.y - b.y);

  // Stiele: von jeder Blüte sanft geschwungen zur Bindestelle
  const stems = heads.map((h) => {
    const bx = clamp(h.x * 0.08, -8, 8);
    const midX = h.x * 0.55 + bx;
    const midY = h.y * 0.45;
    return { id: h.flower.id, d: `M${h.x.toFixed(1)},${h.y.toFixed(1)} Q${midX.toFixed(1)},${midY.toFixed(1)} ${bx.toFixed(1)},0` };
  });

  // Grün: Blätter und Schleierkraut schauen hinter dem Kuppelrand hervor
  const greenR = Math.max(R, 52);
  const arc = Math.PI + 1.0; // von links (leicht unterhalb) über oben nach rechts
  const leafCount = clamp(Math.round((greenR * arc) / (r * 1.45)), 5, 18);
  const leaves = [];
  const fillers = [];
  const inset = Math.max(greenR - r * 0.75, greenR * 0.55);

  // Blätter direkt hinter jeder Blüte füllen Lücken zwischen den Köpfen
  for (const h of heads) {
    const rand = seededRandom(hashString(h.flower.id) ^ 0x9e3779b9);
    const dx = h.x;
    const dy = (h.y - domeY) / SQUASH;
    const outward = Math.hypot(dx, dy) > r * 0.3 ? Math.atan2(dy, dx) : rand() * Math.PI * 2;
    const theta = outward + (rand() - 0.5) * 1.2;
    leaves.push({
      x: h.x + Math.cos(theta) * r * 0.45,
      y: h.y + Math.sin(theta) * r * 0.45 * SQUASH,
      rot: (theta * 180) / Math.PI + 90,
      size: r * (1.15 + rand() * 0.35),
    });
  }
  for (let i = 0; i < leafCount; i++) {
    const t = (i + 0.5) / leafCount;
    const theta = -Math.PI - 0.5 + t * arc;
    const wobble = Math.sin(i * 12.9898) * 0.06;
    leaves.push({
      x: Math.cos(theta) * inset * (1 + wobble),
      y: domeY + Math.sin(theta) * inset * SQUASH * (1 + wobble),
      rot: (theta * 180) / Math.PI + 90 + Math.sin(i * 7.1) * 16,
      size: r * (1.3 + Math.abs(Math.sin(i * 3.7)) * 0.45),
    });
    if (i % 2 === 0 && i < leafCount - 1) {
      const th2 = theta + arc / leafCount / 2;
      fillers.push({
        x: Math.cos(th2) * (inset + r * 0.1),
        y: domeY + Math.sin(th2) * (inset + r * 0.1) * SQUASH,
        rot: (th2 * 180) / Math.PI + 90,
        size: r * 1.2,
      });
    }
  }

  const k = S / 100;
  const wrap = {
    back: `M-13,0 C${-S * 0.5},${-S * 0.4} ${-S * 0.95},${-S * 0.8} ${-S * 1.2},${-S * 1.06} ` +
      `C${-S * 0.9},${-S * 0.98} ${-S * 0.5},${-S * 1.02} 0,${-S * 0.96} ` +
      `C${S * 0.5},${-S * 1.04} ${S * 0.92},${-S * 1.06} ${S * 1.22},${-S * 1.13} ` +
      `C${S * 0.95},${-S * 0.82} ${S * 0.5},${-S * 0.4} 13,0Z`,
    backFold: `M${-S * 1.2},${-S * 1.06} C${-S * 0.85},${-S * 0.76} ${-S * 0.4},${-S * 0.34} -6,0`,
    right: `M-6,3 C${S * 0.1},${-S * 0.2} ${S * 0.1},${-S * 0.3} ${-S * 0.12},${-S * 0.4} ` +
      `C${S * 0.35},${-S * 0.52} ${S * 0.75},${-S * 0.66} ${S * 1.02},${-S * 0.76} ` +
      `C${S * 0.8},${-S * 0.45} ${S * 0.4},${-S * 0.18} 14,3Z`,
    left: `M-15,3 C${-S * 0.42},${-S * 0.2} ${-S * 0.78},${-S * 0.44} ${-S * 0.98},${-S * 0.62} ` +
      `C${-S * 0.55},${-S * 0.5} ${-S * 0.05},${-S * 0.36} ${S * 0.34},${-S * 0.33} ` +
      `C${S * 0.2},${-S * 0.2} ${S * 0.05},${-S * 0.08} 10,4Z`,
    leftFold: `M${-S * 0.62},${-S * 0.46} C${-S * 0.4},${-S * 0.3} ${-S * 0.2},${-S * 0.15} -8,2`,
    tail: `M-14,0 C-16,${S * 0.18} -20,${S * 0.34} -24,${S * 0.44} L-6,${S * 0.5} L4,${S * 0.46} L23,${S * 0.42} ` +
      `C20,${S * 0.32} 16,${S * 0.16} 14,0Z`,
    tailY: S * 0.44,
  };

  const bow = clamp(k, 0.9, 1.5);

  // Sichtbarer Bereich (für Zoom): Kuppel oben, Papierspitze unten
  const reach = Math.max(inset + r * 1.75, R + r * 0.6); // Blattspitzen
  const bounds = {
    minX: -Math.max(S * 1.24, reach),
    maxX: Math.max(S * 1.26, reach),
    minY: Math.min(domeY - Math.max(Ry + r * 1.1, reach * SQUASH), -S * 1.18),
    maxY: Math.max(S * 0.56, 40 * bow + 8),
  };

  return { r, R, S, domeY, heads, stems, leaves, fillers, wrap, bow, bounds };
}
