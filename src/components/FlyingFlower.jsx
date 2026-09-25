import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FlowerIcon } from '../flowers/art.jsx';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Lässt eine Knospe im Bogen vom Button in den Strauß fliegen.
 * Das Ziel wird in jedem Frame neu gemessen, damit auch der Zoom des Straußes mitgeht.
 */
export default function FlyingFlower({ flower, from, onDone }) {
  const ref = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const el = ref.current;
    const start = performance.now();
    const duration = 1200;
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const e = ease(p);
      const hit = document.querySelector(`[data-flower-id="${flower.id}"] .hit`)?.getBoundingClientRect();
      const to = hit
        ? { x: hit.left + hit.width / 2, y: hit.top + hit.height / 2, size: hit.width * 1.08 }
        : { x: window.innerWidth / 2, y: window.innerHeight * 0.4, size: 60 };
      const cx = (from.x + to.x) / 2 + (to.x < from.x ? 70 : -70);
      const cy = Math.min(from.y, to.y) - 150;
      const x = (1 - e) ** 2 * from.x + 2 * (1 - e) * e * cx + e ** 2 * to.x;
      const y = (1 - e) ** 2 * from.y + 2 * (1 - e) * e * cy + e ** 2 * to.y;
      const size = 96 + (to.size - 96) * e;
      const rot = Math.sin(p * Math.PI) * -30;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px) rotate(${rot}deg)`;
      if (p < 1) raf = requestAnimationFrame(step);
      else doneRef.current();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [flower.id, from]);

  return createPortal(
    <div ref={ref} className="pointer-events-none fixed left-0 top-0 z-50" style={{ width: 96, height: 96, transform: `translate(${from.x - 48}px, ${from.y - 48}px)`, filter: 'drop-shadow(0 10px 14px rgb(60 20 30 / 0.22))' }}>
      <FlowerIcon type={flower.flower_type} color={flower.color} bud glow size="100%" />
    </div>,
    document.body,
  );
}
