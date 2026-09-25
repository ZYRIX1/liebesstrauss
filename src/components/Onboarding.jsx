import { useMemo, useState } from 'react';
import { api } from '../api.js';
import Bouquet from './Bouquet.jsx';
import InviteCard from './InviteCard.jsx';
import { Button, Field, IconButton, PinField } from './ui.jsx';
import { IconBack } from './icons.jsx';

const DEMO = [
  ['rose', 'rosa'], ['peony', 'pfirsich'], ['tulip', 'beere'], ['daisy', 'creme'],
  ['lily', 'lavendel'], ['forgetmenot', 'himmel'], ['rose', 'rot'],
].map(([flower_type, color], i) => ({
  id: `welcome-${i}`, flower_type, color, created_at: `2026-01-01T00:0${i}:00.000Z`, opened_at: i === 6 ? null : '2026-01-01',
}));

function Screen({ title, subtitle, onBack, children }) {
  return (
    <div className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8">
      <div className="flex h-14 items-center">
        {onBack && <IconButton label="Zurück" onClick={onBack} className="-ml-2"><IconBack /></IconButton>}
      </div>
      <h1 className="rise-in font-display text-[32px] font-semibold italic leading-tight">{title}</h1>
      {subtitle && <p className="rise-in mt-2 text-[16px] text-muted" style={{ '--delay': '0.05s' }}>{subtitle}</p>}
      <div className="rise-in mt-7 flex flex-1 flex-col" style={{ '--delay': '0.1s' }}>{children}</div>
    </div>
  );
}

function usePinPair() {
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const error = pin2.length >= pin.length && pin2 && pin !== pin2 ? 'Die PINs stimmen nicht überein.' : '';
  const valid = /^\d{4,8}$/.test(pin) && pin === pin2;
  return { pin, setPin, pin2, setPin2, error, valid };
}

function Welcome({ go }) {
  const flowers = useMemo(() => DEMO, []);
  return (
    <div className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8">
      <div className="relative mx-auto mt-2 aspect-[4/5] w-full max-w-[340px] flex-1 fade-in" style={{ maxHeight: '48dvh' }}>
        <Bouquet flowers={flowers} mode="received" names={{ from: '', to: '' }} label="Ein Blumenstrauß" preview />
      </div>
      <h1 className="rise-in mt-2 text-center font-display text-[40px] font-semibold italic leading-none">Liebesstrauß</h1>
      <p className="rise-in mx-auto mt-3 max-w-xs text-center text-[17px] text-muted" style={{ '--delay': '0.06s' }}>
        Ein Strauß voller kleiner Nachrichten – nur für euch zwei. Jede Blume ist ein Brief.
      </p>
      <div className="rise-in mt-8 space-y-3" style={{ '--delay': '0.12s' }}>
        <Button onClick={() => go('create')} className="w-full">Neuen Strauß-Raum erstellen</Button>
        <Button variant="soft" onClick={() => go('join')} className="w-full">Mit Einladungscode beitreten</Button>
        <button type="button" onClick={() => go('login')} className="min-h-12 w-full text-[15px] font-bold text-muted underline-offset-4 active:underline">
          Ich habe schon einen Raum – anmelden
        </button>
      </div>
    </div>
  );
}

function Create({ go, onCreated }) {
  const [name, setName] = useState('');
  const pins = usePinPair();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !pins.valid) return;
    setBusy(true);
    setError('');
    try {
      onCreated(await api.createRoom(name.trim(), pins.pin));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Screen title="Euer Strauß-Raum" subtitle="Erst du, dann dein Schatz. Wie heißt du?" onBack={() => go('welcome')}>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4">
        <Field label="Dein Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="given-name" autoFocus placeholder="z. B. Lea" />
        <PinField label="Wähle eine PIN" value={pins.pin} onValue={pins.setPin} hint="4–8 Ziffern. Damit meldest du dich auf neuen Geräten an." />
        <PinField label="PIN wiederholen" value={pins.pin2} onValue={pins.setPin2} error={pins.error} />
        {error && <p className="px-1 font-semibold text-[#b8435b] dark:text-[#f3a3b3]">{error}</p>}
        <div className="mt-auto pt-4">
          <Button type="submit" loading={busy} disabled={!name.trim() || !pins.valid} className="w-full">Raum erstellen</Button>
        </div>
      </form>
    </Screen>
  );
}

function Invite({ state, onDone }) {
  return (
    <Screen title={`Hallo ${state.me.name} 🌷`} subtitle="Dein Strauß-Raum ist bereit. Jetzt fehlt nur noch dein Schatz.">
      <InviteCard code={state.room.code} title="Einladung verschicken" />
      <p className="mt-4 px-2 text-center text-sm text-muted">
        Merk dir den Code und deine PIN – damit kannst du dich später auf anderen Geräten anmelden.
      </p>
      <div className="mt-auto pt-6">
        <Button variant="soft" onClick={onDone} className="w-full">Weiter zu meinem Strauß</Button>
      </div>
    </Screen>
  );
}

function Join({ go, initialCode, onAuthed }) {
  const [code, setCode] = useState(initialCode || '');
  const [name, setName] = useState('');
  const pins = usePinPair();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [full, setFull] = useState(false);

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const submit = async (e) => {
    e.preventDefault();
    if (cleanCode.length < 6 || !name.trim() || !pins.valid) return;
    setBusy(true);
    setError('');
    try {
      onAuthed(await api.joinRoom(cleanCode, name.trim(), pins.pin));
    } catch (err) {
      setError(err.message);
      setFull(err.status === 409);
      setBusy(false);
    }
  };

  return (
    <Screen title="Beitreten" subtitle="Gib den Einladungscode ein, den du bekommen hast." onBack={() => go('welcome')}>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4">
        <Field
          label="Einladungscode"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={12}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABCD-EFGH"
          inputClassName="text-center font-mono text-xl font-bold tracking-[0.18em]"
        />
        <Field label="Dein Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="given-name" placeholder="z. B. Tom" />
        <PinField label="Wähle eine PIN" value={pins.pin} onValue={pins.setPin} hint="4–8 Ziffern. Damit meldest du dich auf neuen Geräten an." />
        <PinField label="PIN wiederholen" value={pins.pin2} onValue={pins.setPin2} error={pins.error} />
        {error && <p className="px-1 font-semibold text-[#b8435b] dark:text-[#f3a3b3]">{error}</p>}
        {full && <Button variant="soft" onClick={() => go('login', cleanCode)} className="w-full">Zur Anmeldung</Button>}
        <div className="mt-auto pt-4">
          <Button type="submit" loading={busy} disabled={cleanCode.length < 6 || !name.trim() || !pins.valid} className="w-full">Beitreten</Button>
        </div>
      </form>
    </Screen>
  );
}

function Login({ go, initialCode, onAuthed }) {
  const [code, setCode] = useState(initialCode || '');
  const [room, setRoom] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const lookup = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.lookupRoom(cleanCode);
      if (!r.members.length) throw new Error('In diesem Raum ist noch niemand.');
      setRoom(r);
      setMemberId(r.members.length === 1 ? r.members[0].id : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onAuthed(await api.login(room.code, memberId, pin));
    } catch (err) {
      setError(err.message);
      setPin('');
      setBusy(false);
    }
  };

  if (!room) {
    return (
      <Screen title="Anmelden" subtitle="Mit eurem Raum-Code und deiner PIN." onBack={() => go('welcome')}>
        <form onSubmit={lookup} className="flex flex-1 flex-col gap-4">
          <Field
            label="Raum-Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={12}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            placeholder="ABCD-EFGH"
            inputClassName="text-center font-mono text-xl font-bold tracking-[0.18em]"
          />
          {error && <p className="px-1 font-semibold text-[#b8435b] dark:text-[#f3a3b3]">{error}</p>}
          <div className="mt-auto pt-4">
            <Button type="submit" loading={busy} disabled={cleanCode.length < 6} className="w-full">Weiter</Button>
          </div>
        </form>
      </Screen>
    );
  }

  return (
    <Screen title="Wer bist du?" subtitle="Tippe auf deinen Namen und gib deine PIN ein." onBack={() => { setRoom(null); setError(''); }}>
      <form onSubmit={login} className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Person">
          {room.members.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={memberId === m.id}
              onClick={() => setMemberId(m.id)}
              className={`min-h-16 truncate rounded-[22px] border-2 px-3 text-lg font-bold transition active:scale-95 ${memberId === m.id ? 'border-rose bg-rose-soft text-rose-strong' : 'border-line bg-surface'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
        <PinField label="Deine PIN" value={pin} onValue={setPin} autoFocus={!!memberId} />
        {error && <p className="px-1 font-semibold text-[#b8435b] dark:text-[#f3a3b3]">{error}</p>}
        <div className="mt-auto pt-4">
          <Button type="submit" loading={busy} disabled={!memberId || pin.length < 4} className="w-full">Anmelden</Button>
        </div>
      </form>
    </Screen>
  );
}

export default function Onboarding({ initialCode, onAuthed }) {
  const [step, setStep] = useState(initialCode ? 'join' : 'welcome');
  const [code, setCode] = useState(initialCode || '');
  const [created, setCreated] = useState(null);

  const go = (next, withCode) => {
    if (withCode !== undefined) setCode(withCode);
    setStep(next);
    window.scrollTo(0, 0);
  };

  if (created) return <Invite state={created} onDone={() => onAuthed(created)} />;
  if (step === 'create') return <Create go={go} onCreated={setCreated} />;
  if (step === 'join') return <Join key={code} go={go} initialCode={code} onAuthed={onAuthed} />;
  if (step === 'login') return <Login key={code} go={go} initialCode={code} onAuthed={onAuthed} />;
  return <Welcome go={go} />;
}
