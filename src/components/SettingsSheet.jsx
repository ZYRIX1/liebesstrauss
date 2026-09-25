import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { getThemePref, setThemePref } from '../lib/theme.js';
import {
  canInstall, disablePush, enablePush, getPushState, isIOS, isStandalone, onInstallChange, promptInstall,
} from '../lib/push.js';
import { Button, Confirm, Field, PinField, Segmented, Sheet, useToast } from './ui.jsx';
import InviteCard, { formatCode } from './InviteCard.jsx';
import { IconBell, IconLock, IconLogout, IconMoon, IconPhone, IconSun } from './icons.jsx';

function Section({ title, children }) {
  return (
    <section className="mt-6 first:mt-1">
      <h3 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-[0.12em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

const Card = ({ children, className = '' }) => <div className={`rounded-[24px] bg-surface-2 p-4 ${className}`}>{children}</div>;

const PUSH_TEXT = {
  on: 'Du bekommst eine Nachricht, sobald eine neue Blume ankommt.',
  off: 'Lass dich benachrichtigen, wenn eine neue Blume für dich ankommt.',
  denied: 'Benachrichtigungen sind im Browser blockiert. Du kannst sie in den Website-Einstellungen wieder erlauben.',
  unsupported: 'Dieser Browser unterstützt leider keine Push-Benachrichtigungen.',
  'needs-install': 'Auf dem iPhone funktionieren Benachrichtigungen, sobald du die App zum Home-Bildschirm hinzugefügt hast (siehe unten).',
};

export default function SettingsSheet({ open, onClose, me, partner, room, onRenamed, onSignOut }) {
  const toast = useToast();
  const [name, setName] = useState(me.name);
  const [savingName, setSavingName] = useState(false);
  const [theme, setTheme] = useState(getThemePref());
  const [pushState, setPushState] = useState(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [installable, setInstallable] = useState(canInstall());
  const [pinOpen, setPinOpen] = useState(false);
  const [pins, setPins] = useState({ current: '', next: '' });
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(me.name);
    setPinOpen(false);
    setPins({ current: '', next: '' });
    setPinError('');
    getPushState().then(setPushState);
  }, [open, me.name]);

  useEffect(() => onInstallChange(setInstallable), []);

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === me.name) return;
    setSavingName(true);
    try {
      const res = await api.rename(trimmed);
      onRenamed(res);
      toast('Name gespeichert');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingName(false);
    }
  };

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushState === 'on') {
        await disablePush();
        toast('Benachrichtigungen aus');
      } else {
        await enablePush();
        toast('Benachrichtigungen an 🔔');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPushState(await getPushState());
      setPushBusy(false);
    }
  };

  const changePin = async () => {
    setPinError('');
    if (!/^\d{4,8}$/.test(pins.next)) { setPinError('Die neue PIN muss aus 4–8 Ziffern bestehen.'); return; }
    setPinBusy(true);
    try {
      await api.changePin(pins.current, pins.next);
      toast('PIN geändert 🔒');
      setPinOpen(false);
      setPins({ current: '', next: '' });
    } catch (err) {
      setPinError(err.message);
    } finally {
      setPinBusy(false);
    }
  };

  const chooseTheme = (value) => { setTheme(value); setThemePref(value); };

  return (
    <Sheet open={open} onClose={onClose} title="Einstellungen">
      <Section title="Ihr zwei">
        <Card>
          <div className="flex items-end gap-2">
            <Field label="Dein Name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button onClick={saveName} loading={savingName} disabled={!name.trim() || name.trim() === me.name} className="px-5">Speichern</Button>
          </div>
          <p className="mt-3 px-1 text-[15px] text-muted">
            {partner ? <>Dein Schatz: <strong className="text-ink">{partner.name}</strong></> : 'Dein Schatz ist noch nicht beigetreten.'}
          </p>
        </Card>
      </Section>

      <Section title="Einladung & Anmeldung">
        {partner ? (
          <Card>
            <p className="text-[15px] text-muted">
              Mit diesem Raum-Code und deiner PIN meldest du dich auf einem neuen Gerät an:
            </p>
            <p className="mt-2 select-all text-center font-mono text-2xl font-bold tracking-[0.18em]">{formatCode(room.code)}</p>
          </Card>
        ) : (
          <InviteCard code={room.code} className="bg-surface-2! shadow-none!" />
        )}
      </Section>

      <Section title="Benachrichtigungen">
        <Card>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-surface text-rose-strong"><IconBell size={20} /></span>
            <p className="text-[15px] text-muted">{pushState ? PUSH_TEXT[pushState] : '…'}</p>
          </div>
          {(pushState === 'on' || pushState === 'off') && (
            <Button variant={pushState === 'on' ? 'ghost' : 'primary'} onClick={togglePush} loading={pushBusy} className="mt-3 w-full">
              {pushState === 'on' ? 'Benachrichtigungen ausschalten' : 'Benachrichtigungen aktivieren'}
            </Button>
          )}
        </Card>
      </Section>

      {!isStandalone() && (
        <Section title="Als App installieren">
          <Card>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-surface text-rose-strong"><IconPhone size={20} /></span>
              <div className="text-[15px] text-muted">
                {installable ? (
                  <p>Leg den Liebesstrauß auf deinen Homescreen – dann öffnet er sich wie eine richtige App.</p>
                ) : isIOS() ? (
                  <p>
                    In Safari unten auf <strong className="text-ink">Teilen</strong> tippen und <strong className="text-ink">„Zum Home-Bildschirm"</strong> wählen.
                    Danach einmal in der App mit Code <strong className="text-ink">{formatCode(room.code)}</strong> und PIN anmelden.
                  </p>
                ) : (
                  <p>Im Browser-Menü <strong className="text-ink">„App installieren"</strong> bzw. <strong className="text-ink">„Zum Startbildschirm hinzufügen"</strong> wählen.</p>
                )}
              </div>
            </div>
            {installable && <Button onClick={promptInstall} className="mt-3 w-full">Zum Homescreen hinzufügen</Button>}
          </Card>
        </Section>
      )}

      <Section title="Darstellung">
        <Segmented
          value={theme}
          onChange={chooseTheme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: <><IconSun size={18} /> Hell</> },
            { value: 'dark', label: <><IconMoon size={18} /> Dunkel</> },
          ]}
        />
      </Section>

      <Section title="Sicherheit">
        <Card>
          {!pinOpen ? (
            <button type="button" onClick={() => setPinOpen(true)} className="flex min-h-12 w-full items-center gap-3 text-left font-bold">
              <span className="grid size-10 place-items-center rounded-full bg-surface text-rose-strong"><IconLock size={20} /></span>
              PIN ändern
            </button>
          ) : (
            <div className="space-y-3">
              <PinField label="Aktuelle PIN" value={pins.current} onValue={(v) => setPins((p) => ({ ...p, current: v }))} />
              <PinField label="Neue PIN (4–8 Ziffern)" value={pins.next} onValue={(v) => setPins((p) => ({ ...p, next: v }))} error={pinError} />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" onClick={() => setPinOpen(false)}>Abbrechen</Button>
                <Button onClick={changePin} loading={pinBusy} disabled={pins.current.length < 4 || pins.next.length < 4}>Ändern</Button>
              </div>
            </div>
          )}
        </Card>
        <Button variant="outline" onClick={() => setConfirmLogout(true)} className="mt-3 w-full"><IconLogout size={20} /> Abmelden</Button>
      </Section>

      <p className="mb-2 mt-8 text-center text-sm text-muted">Liebesstrauß · mit Liebe gebunden 💐</p>

      <Confirm
        open={confirmLogout}
        title="Abmelden?"
        text={`Zum erneuten Anmelden brauchst du den Code ${formatCode(room.code)} und deine PIN.`}
        confirmLabel="Abmelden"
        danger
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => { setConfirmLogout(false); onSignOut(); }}
      />
    </Sheet>
  );
}
