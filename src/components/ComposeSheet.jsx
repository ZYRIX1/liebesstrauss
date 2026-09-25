import { useEffect, useState } from 'react';
import { COLORS, FLOWER_TYPES, MAX_TEXT, colorById, typeById } from '../../shared/catalog.js';
import { FlowerIcon } from '../flowers/art.jsx';
import { Button, Sheet } from './ui.jsx';
import { IconDice, IconX } from './icons.jsx';

const EMOJIS = ['❤️', '🥰', '😘', '🫶', '✨', '🌸', '🌙', '☀️', '🍀', '😊', '🥹', '🔥'];
const DRAFT_KEY = 'ls-draft';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const readDraft = () => { try { return localStorage.getItem(DRAFT_KEY) || ''; } catch { return ''; } };
const writeDraft = (v) => { try { v ? localStorage.setItem(DRAFT_KEY, v) : localStorage.removeItem(DRAFT_KEY); } catch { /* privat */ } };

function SectionLabel({ children, aside }) {
  return (
    <div className="mb-2 mt-5 flex items-baseline justify-between px-1">
      <span className="text-sm font-extrabold uppercase tracking-[0.12em] text-muted">{children}</span>
      {aside && <span className="text-sm font-semibold text-ink/80">{aside}</span>}
    </div>
  );
}

/** Sheet zum Schreiben (oder Bearbeiten) einer Blume. */
export default function ComposeSheet({ open, editing, partnerName, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('rose');
  const [color, setColor] = useState('rosa');
  const [emoji, setEmoji] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [spin, setSpin] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);
    if (editing) {
      setText(editing.text ?? '');
      setType(editing.flower_type);
      setColor(editing.color);
      setEmoji(editing.emoji ?? null);
    } else {
      setText(readDraft());
      setType(pick(FLOWER_TYPES).id);
      setColor(pick(COLORS).id);
      setEmoji(null);
    }
  }, [open, editing]);

  const updateText = (v) => {
    setText(v);
    if (!editing) writeDraft(v);
  };

  const shuffle = () => {
    setType(pick(FLOWER_TYPES.filter((t) => t.id !== type)).id);
    setColor(pick(COLORS.filter((c) => c.id !== color)).id);
    setSpin((s) => s + 1);
  };

  const length = [...text.trim()].length;
  const canSend = length > 0 && length <= MAX_TEXT && !busy;

  const submit = async () => {
    if (!canSend) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({ text: text.trim(), flower_type: type, color, emoji });
      if (!editing) writeDraft('');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Blume bearbeiten' : `Blume für ${partnerName}`}
      footer={
        <>
          {error && <p className="mb-2 text-center text-sm font-semibold text-[#b8435b] dark:text-[#f3a3b3]">{error}</p>}
          <Button onClick={submit} disabled={!canSend} loading={busy} className="w-full">
            {editing ? 'Änderungen speichern' : 'Blume verschenken 💐'}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4 rounded-[26px] bg-surface-2 p-3 pr-4">
        <span key={spin} className="rise-in grid size-[88px] shrink-0 place-items-center rounded-full bg-surface shadow-soft">
          <FlowerIcon type={type} color={color} size={78} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold italic leading-tight">{typeById(type).name}</p>
          <p className="text-sm text-muted">in {colorById(color).name}{emoji ? ` · ${emoji}` : ''}</p>
        </div>
        <button
          type="button"
          onClick={shuffle}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-rose-strong shadow-soft transition active:rotate-45 active:scale-90"
          aria-label="Zufällige Blume"
          title="Zufällige Blume"
        >
          <IconDice />
        </button>
      </div>

      <SectionLabel aside={`${length}/${MAX_TEXT}`}>Deine Nachricht</SectionLabel>
      <textarea
        value={text}
        onChange={(e) => updateText(e.target.value)}
        maxLength={MAX_TEXT + 50}
        rows={4}
        placeholder="Schreib etwas Liebes …"
        aria-label="Nachricht"
        className="paper-lines block w-full resize-none rounded-[22px] border-2 border-line px-4 pb-2 pt-[5px] font-hand text-[25px] leading-[36px] text-paper-ink outline-none transition placeholder:text-muted/60 focus:border-rose"
        style={{ backgroundPosition: '0 4px', backgroundAttachment: 'local' }}
      />
      {length > MAX_TEXT && <p className="mt-1 px-1 text-sm font-semibold text-[#b8435b]">Bitte kürze deine Nachricht etwas.</p>}

      <SectionLabel aside={typeById(type).name}>Blume</SectionLabel>
      <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Blumenart">
        {FLOWER_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={type === t.id}
            aria-label={t.name}
            onClick={() => setType(t.id)}
            className={`grid aspect-square place-items-center rounded-2xl border-2 transition active:scale-90 ${type === t.id ? 'border-rose bg-rose-soft/60' : 'border-transparent bg-surface-2'}`}
          >
            <FlowerIcon type={t.id} color={color} size={40} />
          </button>
        ))}
      </div>

      <SectionLabel aside={colorById(color).name}>Farbe</SectionLabel>
      <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Farbe">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={color === c.id}
            aria-label={c.name}
            onClick={() => setColor(c.id)}
            className={`relative aspect-square rounded-full border border-black/10 transition active:scale-90 ${color === c.id ? 'scale-105 outline-[3px] outline-offset-2 outline-rose-strong outline-solid' : ''}`}
            style={{ background: `radial-gradient(circle at 35% 30%, ${c.light}, ${c.base} 55%, ${c.dark})` }}
          />
        ))}
      </div>

      <SectionLabel aside="optional">Emoji</SectionLabel>
      <div className="grid grid-cols-7 gap-1.5 pb-2">
        <button
          type="button"
          onClick={() => setEmoji(null)}
          aria-label="Kein Emoji"
          className={`grid aspect-square place-items-center rounded-2xl border-2 text-muted transition active:scale-90 ${!emoji ? 'border-rose bg-rose-soft/60' : 'border-transparent bg-surface-2'}`}
        >
          <IconX size={18} />
        </button>
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            aria-label={`Emoji ${e}`}
            className={`grid aspect-square place-items-center rounded-2xl border-2 text-2xl transition active:scale-90 ${emoji === e ? 'border-rose bg-rose-soft/60' : 'border-transparent bg-surface-2'}`}
          >
            {e}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
