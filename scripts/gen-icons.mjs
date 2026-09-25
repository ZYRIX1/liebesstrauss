// Erzeugt die App-Icons (SVG + PNG) in public/icons. Aufruf: npm run icons
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const OUT = path.resolve('public/icons');
fs.mkdirSync(OUT, { recursive: true });

const roundPetal = (len, w) =>
  `M0,0 C${-w * 1.2},${-len * 0.25} ${-w * 1.05},${-len * 0.95} 0,${-len} C${w * 1.05},${-len * 0.95} ${w * 1.2},${-len * 0.25} 0,0Z`;
const ring = (n, len, w, offset, fill) =>
  Array.from({ length: n }, (_, i) => `<path d="${roundPetal(len, w)}" transform="rotate(${offset + (i * 360) / n})" fill="${fill}" stroke="#C4607B" stroke-opacity="0.45" stroke-width="1.2"/>`).join('');

const leaf = (x, y, rot, s) =>
  `<g transform="translate(${x},${y}) rotate(${rot})"><path d="M0,0 C${s * 0.34},${-s * 0.22} ${s * 0.32},${-s * 0.72} 0,${-s} C${-s * 0.32},${-s * 0.72} ${-s * 0.34},${-s * 0.22} 0,0Z" fill="url(#leaf)"/><path d="M0,-3 Q${s * 0.05},${-s * 0.5} 0,${-s * 0.9}" stroke="#5E8159" stroke-width="2" fill="none" opacity="0.6"/></g>`;

function art() {
  const swirl = [[22, 3, 0], [17.5, 3, 125], [13.5, 2.4, 250], [10, 2, 15], [6.5, 1.4, 140]]
    .map(([r, off, deg], i) => {
      const a = (deg * Math.PI) / 180;
      return `<circle cx="${Math.cos(a) * off}" cy="${Math.sin(a) * off}" r="${r}" fill="${i % 2 ? '#F4A7B9' : 'url(#petal)'}" stroke="#C4607B" stroke-opacity="0.5" stroke-width="1.2"/>`;
    }).join('');
  return `
    ${leaf(-38, 40, -50, 70)}
    ${leaf(38, 40, 50, 70)}
    ${leaf(0, 36, 0, 62)}
    <g transform="translate(0,-8) scale(1.45)">
      ${ring(5, 47, 25, 0, 'url(#petal)')}
      ${ring(5, 36, 20, 36, 'url(#petal2)')}
      ${swirl}
      <path d="M-2,-1 C-2,-4 3,-4 3,0 C3,3 -2,4 -4,1" fill="none" stroke="#AE3149" stroke-width="2" stroke-linecap="round"/>
    </g>`;
}

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF3EE"/><stop offset="1" stop-color="#F7D3DC"/>
    </linearGradient>
    <linearGradient id="petal" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#D97890"/><stop offset="0.5" stop-color="#F4A7B9"/><stop offset="1" stop-color="#FBD5DE"/>
    </linearGradient>
    <linearGradient id="petal2" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#F4A7B9"/><stop offset="1" stop-color="#FDE6EC"/>
    </linearGradient>
    <linearGradient id="leaf" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#6F9A69"/><stop offset="1" stop-color="#A5C79E"/>
    </linearGradient>
  </defs>`;

/** full = randloser Hintergrund (maskable / Apple), scale = Größe des Motivs */
const iconSvg = ({ full = false, scale = 1 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${defs}
  ${full ? '<rect width="512" height="512" fill="url(#bg)"/>' : '<rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bg)"/>'}
  <g transform="translate(256,262) scale(${2.35 * scale})">${art()}</g>
</svg>`;

const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g transform="translate(48,50)" fill="#fff">
    ${Array.from({ length: 5 }, (_, i) => `<path d="${roundPetal(34, 17)}" transform="rotate(${i * 72})"/>`).join('')}
    <circle r="9" fill="#000" fill-opacity="0"/>
  </g>
</svg>`;

const render = (svg, size, file) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(OUT, file), png);
  console.log('✓', file);
};

fs.writeFileSync(path.join(OUT, 'icon.svg'), iconSvg());
console.log('✓ icon.svg');
render(iconSvg(), 192, 'icon-192.png');
render(iconSvg(), 512, 'icon-512.png');
render(iconSvg({ full: true, scale: 0.8 }), 512, 'maskable-512.png');
render(iconSvg({ full: true, scale: 0.92 }), 180, 'apple-touch-icon.png');
render(badgeSvg, 96, 'badge-96.png');
