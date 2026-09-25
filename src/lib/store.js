import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';

const byCreated = (a, b) => a.created_at.localeCompare(b.created_at);

/** App-Zustand: Sitzung, Raum, Blumen – plus Echtzeit-Abgleich per SSE. */
export function useStore() {
  const [status, setStatus] = useState('loading'); // loading | guest | ready | offline
  const [data, setData] = useState(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const refresh = useCallback(async () => {
    try {
      const state = await api.state();
      setData(state);
      setStatus('ready');
    } catch (err) {
      if (err.status === 401) {
        setData(null);
        setStatus('guest');
      } else if (statusRef.current === 'loading') {
        setStatus('offline');
      }
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const upsertFlower = useCallback((flower) => {
    setData((d) => {
      if (!d) return d;
      const existing = d.flowers.find((f) => f.id === flower.id);
      if (!existing) return { ...d, flowers: [...d.flowers, flower].sort(byCreated) };
      // Einmal geöffnet bleibt geöffnet – ältere Ereignisse nicht übernehmen
      const merged = existing.opened_at && !flower.opened_at ? existing : { ...existing, ...flower };
      return { ...d, flowers: d.flowers.map((f) => (f.id === flower.id ? merged : f)) };
    });
  }, []);

  const removeFlower = useCallback((id) => {
    setData((d) => d && { ...d, flowers: d.flowers.filter((f) => f.id !== id) });
  }, []);

  const setMember = useCallback((member) => {
    setData((d) => {
      if (!d) return d;
      if (member.id === d.me.id) return { ...d, me: { ...d.me, name: member.name } };
      return { ...d, partner: { id: member.id, name: member.name } };
    });
  }, []);

  const signIn = useCallback((state) => {
    setData(state);
    setStatus('ready');
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    setData(null);
    setStatus('guest');
  }, []);

  // Echtzeit: neue/aktualisierte Blumen und Mitglieder
  useEffect(() => {
    if (status !== 'ready') return;
    let es;
    let closed = false;
    let hadError = false;
    let retryTimer;

    const connect = () => {
      es = new EventSource('/api/events');
      es.addEventListener('open', () => {
        if (hadError) { hadError = false; refresh(); }
      });
      es.addEventListener('flower', (e) => upsertFlower(JSON.parse(e.data)));
      es.addEventListener('flower-deleted', (e) => removeFlower(JSON.parse(e.data).id));
      es.addEventListener('member', (e) => setMember(JSON.parse(e.data)));
      es.onerror = () => {
        hadError = true;
        if (es.readyState === EventSource.CLOSED && !closed) {
          retryTimer = setTimeout(() => { refresh(); if (!closed) connect(); }, 5000);
        }
      };
    };
    connect();

    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const onSwMessage = (e) => { if (e.data?.type === 'push') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      es.close();
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [status, refresh, upsertFlower, removeFlower, setMember]);

  // Ungelesene Blumen als App-Badge und im Tab-Titel
  const unread = useMemo(
    () => (data ? data.flowers.filter((f) => f.to_user === data.me.id && !f.opened_at).length : 0),
    [data],
  );
  useEffect(() => {
    document.title = unread ? `(${unread}) Liebesstrauß` : 'Liebesstrauß';
    if ('setAppBadge' in navigator) {
      (unread ? navigator.setAppBadge(unread) : navigator.clearAppBadge()).catch(() => {});
    }
  }, [unread]);

  return { status, data, refresh, upsertFlower, removeFlower, setMember, signIn, signOut };
}
