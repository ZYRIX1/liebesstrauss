import { useMemo } from 'react';
import { FlowerIcon } from '../flowers/art.jsx';
import { typeById } from '../../shared/catalog.js';
import { dayLabel, formatTime } from '../lib/format.js';
import { IconCheck } from './icons.jsx';

/** Verlauf aller Blumen eines Straußes – neueste zuerst, nach Tagen gruppiert. */
export default function HistoryList({ flowers, mode, emptyText, onSelect }) {
  const groups = useMemo(() => {
    const out = [];
    for (const f of [...flowers].reverse()) {
      const label = dayLabel(f.created_at);
      if (out.at(-1)?.label !== label) out.push({ label, items: [] });
      out.at(-1).items.push(f);
    }
    return out;
  }, [flowers]);

  if (!flowers.length) {
    return <p className="px-8 pt-16 text-center text-muted">{emptyText}</p>;
  }

  return (
    <div className="px-4 pb-6">
      {groups.map((g) => (
        <section key={g.label} className="mt-3">
          <h3 className="sticky top-0 z-10 -mx-1 bg-bg/85 px-2 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted backdrop-blur">{g.label}</h3>
          <ul className="space-y-2.5">
            {g.items.map((f, i) => {
              const sealed = !f.opened_at;
              const t = typeById(f.flower_type);
              return (
                <li key={f.id} className="rise-in" style={{ '--delay': `${Math.min(i, 8) * 0.03}s` }}>
                  <button
                    type="button"
                    onClick={() => onSelect(f)}
                    className="flex min-h-[76px] w-full items-center gap-3 rounded-[24px] bg-surface p-2.5 pr-4 text-left shadow-soft transition active:scale-[0.98]"
                  >
                    <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-surface-2">
                      <FlowerIcon type={f.flower_type} color={f.color} bud={sealed} glow={sealed && mode === 'received'} size={50} />
                    </span>
                    <span className="min-w-0 flex-1">
                      {mode === 'received' && sealed ? (
                        <span className="shimmer-text block text-[16px] font-extrabold">Verschlossen – tippe zum Öffnen</span>
                      ) : (
                        <span className="line-clamp-2 font-hand text-[22px] leading-[24px] text-ink">
                          {f.emoji ? `${f.emoji} ` : ''}{f.text}
                        </span>
                      )}
                      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
                        <span>{t.name}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatTime(f.created_at)}</span>
                        {mode === 'sent' && (
                          sealed ? (
                            <><span aria-hidden="true">·</span><span>noch zu</span></>
                          ) : (
                            <span className="ml-0.5 inline-flex items-center gap-1 font-bold text-sage-strong">
                              <IconCheck size={14} strokeWidth={3} /> geöffnet
                            </span>
                          )
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
