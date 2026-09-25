import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlowerIcon } from '../flowers/art.jsx';
import { aLabel, colorById, typeById, yourLabel } from '../../shared/catalog.js';
import { formatLong, formatOpened } from '../lib/format.js';
import { Button, IconButton } from './ui.jsx';
import { IconCheck, IconClock, IconPencil, IconTrash, IconX, IconHeart } from './icons.jsx';

function Envelope({ open, color, onSkip }) {
  const c = colorById(color);
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Brief öffnen"
      className={`env-in relative h-[196px] w-[292px] max-w-[86vw] ${open ? 'env-open' : ''}`}
      style={{ perspective: '900px' }}
    >
      <div className="absolute inset-0 rounded-[18px]" style={{ background: c.dark }} />
      <div className="env-letter paper-lines absolute inset-x-4 bottom-3 top-3 rounded-xl shadow-soft">
        <div className="space-y-[14px] px-5 pt-6">
          <div className="h-2 w-3/4 rounded-full bg-rose/40" />
          <div className="h-2 w-full rounded-full bg-rose/30" />
          <div className="h-2 w-2/3 rounded-full bg-rose/30" />
        </div>
      </div>
      <div
        className="env-pocket absolute inset-0 rounded-[18px] shadow-lift"
        style={{ background: `linear-gradient(160deg, ${c.light}, ${c.base})`, clipPath: 'polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%)' }}
      />
      <div
        className="absolute inset-0 z-[3] rounded-[18px]"
        style={{ background: `linear-gradient(20deg, transparent 45%, ${c.dark}33 50%, transparent 55%), linear-gradient(-20deg, transparent 45%, ${c.dark}33 50%, transparent 55%)`, clipPath: 'polygon(0 100%, 50% 50%, 100% 100%)' }}
      />
      <div
        className="env-flap absolute inset-x-0 top-0 h-[60%] rounded-t-[18px]"
        style={{ background: `linear-gradient(180deg, ${c.base}, ${c.light})`, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
      />
      <div
        className="env-seal absolute left-1/2 top-[60%] grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white shadow-soft"
        style={{ background: 'radial-gradient(circle at 35% 30%, #e7788f, #b8435b)' }}
      >
        <IconHeart filled size={22} strokeWidth={1.5} />
      </div>
    </button>
  );
}

/**
 * Die geöffnete Nachricht als kleiner Brief.
 * Beim ersten Öffnen erscheint zuerst ein Umschlag, der sich öffnet.
 */
export default function LetterView({ flower, mode, partnerName, envelope, onClose, onEdit, onDelete }) {
  const [phase, setPhase] = useState(envelope ? 'envelope' : 'card');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (phase !== 'envelope') return;
    const t1 = setTimeout(() => setOpen(true), 380);
    const t2 = setTimeout(() => setPhase('card'), 1480);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const t = typeById(flower.flower_type);
  const received = mode === 'received';
  const title = received ? `${aLabel(t)} von ${partnerName}` : `${yourLabel(t)} für ${partnerName}`;

  return createPortal(
    <div className="fixed inset-x-0 z-50 flex items-center justify-center p-4" style={{ top: 'var(--vvt, 0px)', height: 'var(--vvh, 100dvh)' }}>
      <div className="absolute inset-0 bg-[#2a1a20]/50 backdrop-blur-[3px] fade-in" onClick={phase === 'card' ? onClose : () => setPhase('card')} />

      {phase === 'envelope' ? (
        <Envelope open={open} color={flower.color} onSkip={() => setPhase('card')} />
      ) : (
        <article
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="card-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-[30px] bg-paper text-paper-ink shadow-lift"
        >
          <header className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-5">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-rose-soft/70">
              <FlowerIcon type={flower.flower_type} color={flower.color} size={58} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-rose-strong">{received ? 'Für dich' : 'Von dir'}</p>
              <h2 className="font-display text-[21px] font-semibold italic leading-tight">{title}</h2>
            </div>
            <IconButton label="Schließen" onClick={onClose} className="-mr-2 self-start text-paper-ink/70"><IconX /></IconButton>
          </header>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
            <div
              className="paper-lines min-h-[216px] whitespace-pre-wrap break-words px-6 pb-3 pt-[6px] font-hand text-[27px] leading-[36px]"
              style={{ backgroundPosition: '0 4px', backgroundAttachment: 'local' }}
            >
              {flower.text}
              {received && (
                <span className="mt-1 block text-right text-[26px] text-rose-strong">– {partnerName}</span>
              )}
            </div>
            {flower.emoji && <div className="pb-2 pt-1 text-center text-5xl" aria-label={`Emoji ${flower.emoji}`}>{flower.emoji}</div>}
          </div>

          <footer className="shrink-0 space-y-3 border-t border-dashed border-paper-ink/15 px-5 pb-5 pt-4">
            <p className="flex items-center gap-2 text-sm text-muted">
              <IconClock size={16} /> {formatLong(flower.created_at)}
            </p>
            {!received && (flower.opened_at ? (
              <p className="flex items-center gap-2 text-sm font-bold text-sage-strong">
                <span className="grid size-5 place-items-center rounded-full bg-sage-strong text-white dark:text-[#1d1719]"><IconCheck size={13} strokeWidth={3} /></span>
                Geöffnet am {formatOpened(flower.opened_at)}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted">Noch nicht geöffnet – du kannst sie noch ändern oder löschen.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="ghost" onClick={onEdit} className="min-h-12 px-4 text-base"><IconPencil size={18} /> Bearbeiten</Button>
                  <Button variant="danger" onClick={onDelete} className="min-h-12 px-4 text-base"><IconTrash size={18} /> Löschen</Button>
                </div>
              </>
            ))}
          </footer>
        </article>
      )}
    </div>,
    document.body,
  );
}
