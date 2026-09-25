import { Button, useToast } from './ui.jsx';
import { IconCopy, IconShare } from './icons.jsx';

export const formatCode = (code) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);
export const inviteLink = (code) => `${location.origin}/join/${code}`;

export default function InviteCard({ code, title = 'Lade deinen Schatz ein', text, className = '' }) {
  const toast = useToast();
  const link = inviteLink(code);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Liebesstrauß', text: 'Komm in unseren Liebesstrauß 💐', url: link });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    copy();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link kopiert 💌');
    } catch {
      toast(`Code: ${formatCode(code)}`);
    }
  };

  return (
    <div className={`rounded-[28px] bg-surface p-5 text-center shadow-soft ${className}`}>
      <p className="font-display text-[22px] font-semibold italic">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-[15px] text-muted">
        {text ?? 'Schick diesen Link oder Code. Sobald ihr beide drin seid, könnt ihr euch Blumen schenken.'}
      </p>
      <div className="mt-4 select-all rounded-2xl bg-surface-2 py-3.5 font-mono text-[26px] font-bold tracking-[0.18em]" aria-label={`Einladungscode ${code.split('').join(' ')}`}>
        {formatCode(code)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button onClick={share} className="px-3"><IconShare size={20} /> Teilen</Button>
        <Button variant="ghost" onClick={copy} className="px-3"><IconCopy size={20} /> Kopieren</Button>
      </div>
    </div>
  );
}
