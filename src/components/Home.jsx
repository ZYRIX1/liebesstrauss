import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { plural } from '../lib/format.js';
import { typeById, yourLabel } from '../../shared/catalog.js';
import { enablePush, getPushState } from '../lib/push.js';
import Bouquet from './Bouquet.jsx';
import ComposeSheet from './ComposeSheet.jsx';
import FlyingFlower from './FlyingFlower.jsx';
import HistoryList from './HistoryList.jsx';
import InviteCard from './InviteCard.jsx';
import LetterView from './LetterView.jsx';
import SettingsSheet from './SettingsSheet.jsx';
import { Confirm, IconButton, Segmented, useToast } from './ui.jsx';
import { IconBell, IconBouquet, IconList, IconPlus, IconSettings, IconX } from './icons.jsx';

const MAX_IN_BOUQUET = 40;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const genitive = (name) => (/[sßxz]$/i.test(name) ? `${name}'` : `${name}s`);

function readPref(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function writePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* privat */ }
}

/** Bei sehr vielen Blumen: alle ungeöffneten + die neuesten geöffneten zeigen. */
function forBouquet(list) {
  if (list.length <= MAX_IN_BOUQUET) return list;
  const sealed = list.filter((f) => !f.opened_at);
  const room = Math.max(0, MAX_IN_BOUQUET - sealed.length);
  const opened = room ? list.filter((f) => f.opened_at).slice(-room) : [];
  const keep = new Set([...sealed, ...opened].map((f) => f.id));
  return list.filter((f) => keep.has(f.id));
}

function PushHint() {
  const toast = useToast();
  const [state, setState] = useState(null);
  const [hidden, setHidden] = useState(() => readPref('ls-push-hint', '') === 'no');
  useEffect(() => { getPushState().then(setState).catch(() => {}); }, []);
  if (hidden || state !== 'off') return null;

  const dismiss = () => { writePref('ls-push-hint', 'no'); setHidden(true); };
  const enable = async () => {
    try {
      await enablePush();
      toast('Benachrichtigungen an 🔔');
      setState('on');
    } catch (err) {
      toast(err.message, 'error');
      setState(await getPushState());
    }
  };

  return (
    <div className="rise-in mx-4 mt-2 flex items-center gap-2 rounded-[20px] bg-surface/90 py-1.5 pl-3 pr-1 shadow-soft">
      <IconBell size={18} className="shrink-0 text-rose-strong" />
      <button type="button" onClick={enable} className="min-h-10 flex-1 text-left text-[14px] font-bold">
        Benachrichtigen, wenn eine Blume ankommt?
      </button>
      <IconButton label="Hinweis ausblenden" onClick={dismiss} className="size-10 text-muted"><IconX size={18} /></IconButton>
    </div>
  );
}

export default function Home({ store }) {
  const { data } = store;
  const { me, partner, room, flowers } = data;
  const toast = useToast();

  const [tab, setTab] = useState('mine');
  const [view, setViewState] = useState(() => readPref('ls-view', 'bouquet'));
  const [compose, setCompose] = useState(null); // { editing?: flower }
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [letter, setLetter] = useState(null); // { id, envelope }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bloomingId, setBloomingId] = useState(null);
  const [wiggleId, setWiggleId] = useState(null);
  const [flight, setFlight] = useState(null);
  const [hiddenId, setHiddenId] = useState(null);
  const [arrivedId, setArrivedId] = useState(null);
  const fabRef = useRef(null);
  const opening = useRef(false);

  const setView = (v) => { setViewState(v); writePref('ls-view', v); };

  const received = useMemo(() => flowers.filter((f) => f.to_user === me.id), [flowers, me.id]);
  const sent = useMemo(() => flowers.filter((f) => f.from_user === me.id), [flowers, me.id]);
  const current = tab === 'mine' ? received : sent;
  const bouquetFlowers = useMemo(() => forBouquet(current), [current]);
  const sealedCount = current.filter((f) => !f.opened_at).length;
  const unreadMine = received.filter((f) => !f.opened_at).length;
  const mode = tab === 'mine' ? 'received' : 'sent';
  const partnerName = partner?.name ?? 'deinen Schatz';
  const names = useMemo(() => ({ from: partnerName, to: partnerName }), [partnerName]);

  const letterFlower = letter && flowers.find((f) => f.id === letter.id);
  useEffect(() => { if (letter && !letterFlower) setLetter(null); }, [letter, letterFlower]);

  // Live-Ereignisse: neue Blume angekommen / eigene Blume wurde geöffnet
  const seen = useRef(null);
  const viewRef = useRef({ tab, view });
  viewRef.current = { tab, view };
  useEffect(() => {
    const before = seen.current;
    seen.current = new Map(flowers.map((f) => [f.id, !!f.opened_at]));
    if (!before) return;
    for (const f of flowers) {
      if (!before.has(f.id) && f.to_user === me.id) {
        setArrivedId(f.id);
        setTimeout(() => setArrivedId((a) => (a === f.id ? null : a)), 900);
        toast(`Neue Blume von ${partnerName} 🌷`);
      } else if (before.get(f.id) === false && f.opened_at && f.from_user === me.id) {
        const label = yourLabel(typeById(f.flower_type));
        toast(`${partnerName} hat ${label.charAt(0).toLowerCase()}${label.slice(1)} geöffnet 💞`);
        const { tab: t, view: v } = viewRef.current;
        if (t === 'theirs' && v === 'bouquet' && !reducedMotion()) {
          setBloomingId(f.id);
          setTimeout(() => setBloomingId((b) => (b === f.id ? null : b)), 2000);
        }
      }
    }
  }, [flowers]); // eslint-disable-line react-hooks/exhaustive-deps

  const wiggle = (id) => {
    setWiggleId(id);
    setTimeout(() => setWiggleId((w) => (w === id ? null : w)), 650);
  };

  const openFlower = useCallback(async (f, fromBouquet) => {
    if (opening.current) return;
    opening.current = true;
    const request = api.openFlower(f.id);
    if (fromBouquet && !reducedMotion()) {
      setBloomingId(f.id);
      await sleep(1150);
    }
    try {
      const full = await request;
      store.upsertFlower(full);
      setLetter({ id: f.id, envelope: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      opening.current = false;
      setTimeout(() => setBloomingId((b) => (b === f.id ? null : b)), 900);
    }
  }, [store, toast]);

  const select = useCallback((f, fromBouquet = true) => {
    if (mode === 'received' && !f.opened_at) {
      openFlower(f, fromBouquet);
      return;
    }
    if (fromBouquet) wiggle(f.id);
    setLetter({ id: f.id, envelope: false });
  }, [mode, openFlower]);

  const startCompose = () => {
    if (!partner) {
      toast(`Lade zuerst ${partnerName} ein 💌`);
      setSettingsOpen(true);
      return;
    }
    setCompose({});
  };

  const submitFlower = async (values) => {
    if (compose?.editing) {
      const updated = await api.updateFlower(compose.editing.id, values);
      store.upsertFlower(updated);
      setCompose(null);
      toast('Blume aktualisiert 🌸');
      return;
    }
    const created = await api.createFlower(values);
    const fab = fabRef.current?.getBoundingClientRect();
    const from = fab ? { x: fab.left + fab.width / 2, y: fab.top + fab.height / 2 } : { x: innerWidth / 2, y: innerHeight - 60 };
    setCompose(null);
    setTab('theirs');
    if (view === 'bouquet' && !reducedMotion()) {
      setHiddenId(created.id);
      store.upsertFlower(created);
      setFlight({ flower: created, from });
    } else {
      store.upsertFlower(created);
      toast(`In ${genitive(partnerName)} Strauß gesteckt 💐`);
    }
  };

  const landed = useCallback(() => {
    const id = flight?.flower.id;
    setFlight(null);
    setHiddenId(null);
    setArrivedId(id);
    setTimeout(() => setArrivedId((a) => (a === id ? null : a)), 900);
  }, [flight]);

  const deleteFlower = async () => {
    setDeleting(true);
    try {
      await api.deleteFlower(confirmDelete.id);
      store.removeFlower(confirmDelete.id);
      setConfirmDelete(null);
      setLetter(null);
      toast('Blume gelöscht');
    } catch (err) {
      toast(err.message, 'error');
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const emptyText = tab === 'mine'
    ? `Dein Strauß wartet noch auf die erste Blume von ${partnerName}.`
    : `Steck ${partnerName} die erste Blume in den Strauß 🌷`;

  const tabs = [
    {
      value: 'mine',
      label: (
        <>
          <span className="truncate">Mein Strauß</span>
          {unreadMine > 0 && tab !== 'mine' && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-strong px-1.5 text-[11px] font-extrabold text-white dark:bg-rose dark:text-on-rose">{unreadMine}</span>
          )}
        </>
      ),
    },
    { value: 'theirs', label: <span className="truncate">Für {partner?.name ?? '…'}</span> },
  ];

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden">
      <header className="pt-safe flex shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-rose-soft text-rose-strong"><IconBouquet size={20} /></span>
          <span className="font-display text-[24px] font-semibold italic">Liebesstrauß</span>
        </div>
        <div className="-mr-2 flex">
          <IconButton label={view === 'bouquet' ? 'Verlauf anzeigen' : 'Strauß anzeigen'} onClick={() => setView(view === 'bouquet' ? 'list' : 'bouquet')}>
            {view === 'bouquet' ? <IconList /> : <IconBouquet />}
          </IconButton>
          <IconButton label="Einstellungen" onClick={() => setSettingsOpen(true)}><IconSettings /></IconButton>
        </div>
      </header>

      <div className="shrink-0 px-4 pt-2">
        <Segmented options={tabs} value={tab} onChange={setTab} />
        <p className="mt-2.5 text-center text-[14px] font-semibold text-muted" aria-live="polite">
          {plural(current.length, 'Blume', 'Blumen')} · {sealedCount} ungeöffnet
        </p>
      </div>

      {partner && <PushHint />}

      <main className="relative min-h-0 flex-1">
        {!partner ? (
          <div className="scroll-thin h-full overflow-y-auto px-4 pb-4 pt-2">
            <div className="mx-auto aspect-[4/5] w-full max-w-[260px] fade-in">
              <Bouquet flowers={bouquetFlowers} mode={mode} names={names} label="Dein Strauß" preview />
            </div>
            <InviteCard code={room.code} className="rise-in" />
          </div>
        ) : view === 'list' ? (
          <div key={`list-${tab}`} className="scroll-thin h-full overflow-y-auto fade-in">
            <HistoryList flowers={current} mode={mode} emptyText={emptyText} onSelect={(f) => select(f, false)} />
          </div>
        ) : (
          <div key={`bouquet-${tab}`} className="fade-in flex h-full flex-col items-center justify-center px-2">
            <div className="relative h-full max-h-[600px] w-full">
              <Bouquet
                flowers={bouquetFlowers}
                mode={mode}
                names={names}
                label={tab === 'mine' ? 'Mein Strauß' : `Strauß für ${partnerName}`}
                onSelect={select}
                bloomingId={bloomingId}
                hiddenId={hiddenId}
                arrivedId={arrivedId}
                wiggleId={wiggleId}
              />
              {current.length === 0 && (
                <p className="absolute inset-x-6 top-3 text-center font-hand text-[26px] leading-7 text-muted">{emptyText}</p>
              )}
            </div>
            {current.length > bouquetFlowers.length && (
              <button type="button" onClick={() => setView('list')} className="mb-1 min-h-10 text-sm font-semibold text-muted underline underline-offset-4">
                Ältere Blumen findest du im Verlauf
              </button>
            )}
          </div>
        )}
      </main>

      <div className="pb-safe flex shrink-0 justify-center px-4 pt-2">
        <button
          ref={fabRef}
          type="button"
          onClick={startCompose}
          className="flex h-16 items-center gap-3 rounded-full bg-rose-strong pl-2.5 pr-7 text-[18px] font-extrabold text-white shadow-lift transition active:scale-95 dark:bg-rose dark:text-on-rose"
        >
          <span className="grid size-11 place-items-center rounded-full bg-white/25"><IconPlus size={26} strokeWidth={2.6} /></span>
          Blume hinzufügen
        </button>
      </div>

      <ComposeSheet
        open={!!compose}
        editing={compose?.editing}
        partnerName={partnerName}
        onClose={() => setCompose(null)}
        onSubmit={submitFlower}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        me={me}
        partner={partner}
        room={room}
        onRenamed={store.setMember}
        onSignOut={store.signOut}
      />

      {letterFlower && (
        <LetterView
          key={letterFlower.id}
          flower={letterFlower}
          mode={letterFlower.to_user === me.id ? 'received' : 'sent'}
          partnerName={partnerName}
          envelope={letter.envelope}
          onClose={() => setLetter(null)}
          onEdit={() => { setLetter(null); setCompose({ editing: letterFlower }); }}
          onDelete={() => setConfirmDelete(letterFlower)}
        />
      )}

      <Confirm
        open={!!confirmDelete}
        title="Blume löschen?"
        text={`${partnerName} hat sie noch nicht geöffnet. Sie verschwindet dann aus dem Strauß.`}
        confirmLabel="Löschen"
        danger
        loading={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={deleteFlower}
      />

      {flight && <FlyingFlower flower={flight.flower} from={flight.from} onDone={landed} />}
    </div>
  );
}
