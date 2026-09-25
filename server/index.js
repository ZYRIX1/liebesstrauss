import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { db, tx } from './db.js';
import {
  now, newId, newRoomCode, normalizeCode, hashPin, isValidPin, verifyPin,
  createSession, destroySession, loadSession, requireMember, rateLimit, sameOriginWrites,
} from './auth.js';
import { subscribe, broadcast } from './realtime.js';
import { vapidPublicKey, saveSubscription, removeSubscription, sendPush } from './push.js';
import { TYPE_IDS, COLOR_IDS, MAX_TEXT, typeById } from '../shared/catalog.js';

const DEV = process.argv.includes('--dev');
const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(import.meta.dirname, '..');

const app = express();
app.disable('x-powered-by');
// Hinter einem Reverse-Proxy (Caddy, Fly, Railway …) die echte Client-IP und HTTPS erkennen.
app.set('trust proxy', process.env.TRUST_PROXY ?? 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (!DEV) {
    res.set('Content-Security-Policy', [
      "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:", "font-src 'self' data:", "connect-src 'self'",
      "manifest-src 'self'", "worker-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
    ].join('; '));
  }
  next();
});

const api = express.Router();
api.use(express.json({ limit: '20kb' }));
api.use(sameOriginWrites);
api.use(loadSession);
api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ---------- Hilfsfunktionen ----------

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

const cleanName = (name) => {
  const n = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (n.length < 1 || n.length > 30) fail(400, 'Bitte gib einen Namen mit 1–30 Zeichen ein.');
  return n;
};
const cleanPin = (pin) => {
  if (!isValidPin(pin)) fail(400, 'Die PIN muss aus 4–8 Ziffern bestehen.');
  return String(pin);
};
const EMOJI_RE = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️)+$/u;

function cleanFlowerInput(body, partial = false) {
  const out = {};
  if (!partial || body.text !== undefined) {
    const text = String(body.text ?? '').trim();
    const len = [...text].length;
    if (len < 1) fail(400, 'Die Nachricht ist leer.');
    if (len > MAX_TEXT) fail(400, `Die Nachricht darf höchstens ${MAX_TEXT} Zeichen haben.`);
    out.text = text;
  }
  if (!partial || body.flower_type !== undefined) {
    if (!TYPE_IDS.includes(body.flower_type)) fail(400, 'Unbekannte Blumensorte.');
    out.flower_type = body.flower_type;
  }
  if (!partial || body.color !== undefined) {
    if (!COLOR_IDS.includes(body.color)) fail(400, 'Unbekannte Farbe.');
    out.color = body.color;
  }
  if (!partial || body.emoji !== undefined) {
    const emoji = body.emoji ? String(body.emoji).trim() : null;
    if (emoji && (emoji.length > 32 || !EMOJI_RE.test(emoji))) fail(400, 'Ungültiges Emoji.');
    out.emoji = emoji || null;
  }
  return out;
}

/** Der Empfänger bekommt Text & Emoji einer Blume erst, wenn er sie öffnet. */
function serializeFlower(f, viewerId) {
  const sealed = f.to_user === viewerId && !f.opened_at;
  return {
    id: f.id,
    from_user: f.from_user,
    to_user: f.to_user,
    flower_type: f.flower_type,
    color: f.color,
    created_at: f.created_at,
    updated_at: f.updated_at,
    opened_at: f.opened_at,
    text: sealed ? null : f.text,
    emoji: sealed ? null : f.emoji,
  };
}

const getRoomByCode = (code) => db.prepare('SELECT * FROM rooms WHERE code = ?').get(normalizeCode(code));
const getMembers = (roomId) => db.prepare('SELECT id, name, created_at FROM members WHERE room_id = ? ORDER BY created_at').all(roomId);
const getFlower = (id, roomId) => db.prepare('SELECT * FROM flowers WHERE id = ? AND room_id = ?').get(id, roomId);
const unreadCount = (memberId) => db.prepare('SELECT COUNT(*) AS n FROM flowers WHERE to_user = ? AND opened_at IS NULL').get(memberId).n;

function stateFor(member) {
  const room = db.prepare('SELECT code, created_at FROM rooms WHERE id = ?').get(member.room_id);
  const members = getMembers(member.room_id);
  const me = members.find((m) => m.id === member.id);
  const partner = members.find((m) => m.id !== member.id) ?? null;
  // Datenzugriff nur auf den eigenen Raum ("Row Level Security" auf Serverseite)
  const flowers = db.prepare('SELECT * FROM flowers WHERE room_id = ? ORDER BY created_at').all(member.room_id)
    .map((f) => serializeFlower(f, member.id));
  return {
    me: { id: me.id, name: me.name },
    partner: partner && { id: partner.id, name: partner.name },
    room: { code: room.code, created_at: room.created_at },
    flowers,
  };
}

const wrap = (fn) => (req, res, next) => {
  try {
    const result = fn(req, res);
    if (result instanceof Promise) result.catch(next);
  } catch (err) {
    next(err);
  }
};

// ---------- Raum & Anmeldung ----------

const authLimit = rateLimit({ key: 'auth', limit: 30, windowMs: 10 * 60 * 1000 });

api.post('/rooms', authLimit, wrap((req, res) => {
  const name = cleanName(req.body.name);
  const pin = cleanPin(req.body.pin);
  const memberId = newId();
  tx(() => {
    let code;
    do code = newRoomCode(); while (getRoomByCode(code));
    const roomId = newId();
    db.prepare('INSERT INTO rooms (id, code, created_at) VALUES (?, ?, ?)').run(roomId, code, now());
    const { hash, salt } = hashPin(pin);
    db.prepare('INSERT INTO members (id, room_id, name, pin_hash, pin_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(memberId, roomId, name, hash, salt, now());
  });
  createSession(res, memberId);
  const member = db.prepare('SELECT id, room_id FROM members WHERE id = ?').get(memberId);
  res.status(201).json(stateFor(member));
}));

api.get('/rooms/:code', authLimit, wrap((req, res) => {
  const room = getRoomByCode(req.params.code);
  if (!room) fail(404, 'Diesen Einladungscode gibt es nicht.');
  const members = getMembers(room.id);
  res.json({ code: room.code, members: members.map((m) => ({ id: m.id, name: m.name })), full: members.length >= 2 });
}));

api.post('/rooms/:code/join', authLimit, wrap((req, res) => {
  const name = cleanName(req.body.name);
  const pin = cleanPin(req.body.pin);
  const room = getRoomByCode(req.params.code);
  if (!room) fail(404, 'Diesen Einladungscode gibt es nicht.');
  const memberId = newId();
  tx(() => {
    const members = getMembers(room.id);
    if (members.length >= 2) fail(409, 'Dieser Strauß-Raum ist schon vollständig. Melde dich stattdessen an.');
    const { hash, salt } = hashPin(pin);
    db.prepare('INSERT INTO members (id, room_id, name, pin_hash, pin_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(memberId, room.id, name, hash, salt, now());
  });
  createSession(res, memberId);
  const member = db.prepare('SELECT id, room_id FROM members WHERE id = ?').get(memberId);
  broadcast(room.id, 'member', { id: memberId, name });
  const creator = getMembers(room.id).find((m) => m.id !== memberId);
  if (creator) {
    sendPush(creator.id, { title: 'Liebesstrauß 💐', body: `${name} ist eurem Strauß-Raum beigetreten.`, tag: 'joined', url: '/' });
  }
  res.status(201).json(stateFor(member));
}));

api.post('/login', authLimit, wrap((req, res) => {
  const room = getRoomByCode(req.body.code);
  if (!room) fail(404, 'Diesen Einladungscode gibt es nicht.');
  const member = db.prepare('SELECT * FROM members WHERE id = ? AND room_id = ?').get(String(req.body.memberId ?? ''), room.id);
  if (!member) fail(404, 'Diese Person gibt es in diesem Raum nicht.');
  const check = verifyPin(member, req.body.pin);
  if (!check.ok) fail(401, check.error);
  createSession(res, member.id);
  res.json(stateFor(member));
}));

api.post('/logout', wrap((req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
}));

// ---------- Ab hier nur für Mitglieder ----------

api.get('/state', requireMember, wrap((req, res) => res.json(stateFor(req.member))));

api.patch('/me', requireMember, wrap((req, res) => {
  const name = cleanName(req.body.name);
  db.prepare('UPDATE members SET name = ? WHERE id = ?').run(name, req.member.id);
  broadcast(req.member.room_id, 'member', { id: req.member.id, name });
  res.json({ id: req.member.id, name });
}));

api.post('/me/pin', requireMember, wrap((req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.member.id);
  const check = verifyPin(member, req.body.currentPin);
  if (!check.ok) fail(401, check.error);
  const { hash, salt } = hashPin(cleanPin(req.body.newPin));
  db.prepare('UPDATE members SET pin_hash = ?, pin_salt = ? WHERE id = ?').run(hash, salt, member.id);
  res.json({ ok: true });
}));

const writeLimit = rateLimit({ key: 'write', limit: 120, windowMs: 10 * 60 * 1000 });

api.post('/flowers', requireMember, writeLimit, wrap((req, res) => {
  const input = cleanFlowerInput(req.body);
  const { id: me, room_id: roomId } = req.member;
  const partner = getMembers(roomId).find((m) => m.id !== me);
  if (!partner) fail(409, 'Dein Partner ist noch nicht beigetreten.');
  const id = newId();
  db.prepare(`
    INSERT INTO flowers (id, room_id, from_user, to_user, text, flower_type, color, emoji, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, roomId, me, partner.id, input.text, input.flower_type, input.color, input.emoji, now());
  const flower = getFlower(id, roomId);
  broadcast(roomId, 'flower', (viewer) => serializeFlower(flower, viewer));
  sendPush(partner.id, {
    title: 'Eine neue Knospe für dich 🌷',
    body: `${req.member.name} hat dir ${typeById(flower.flower_type).withArticle} in den Strauß gesteckt.`,
    tag: 'flower',
    badge: unreadCount(partner.id),
    url: '/',
  });
  res.status(201).json(serializeFlower(flower, me));
}));

api.patch('/flowers/:id', requireMember, writeLimit, wrap((req, res) => {
  const { id: me, room_id: roomId } = req.member;
  const input = cleanFlowerInput(req.body, true);
  const flower = getFlower(req.params.id, roomId);
  if (!flower || flower.from_user !== me) fail(404, 'Blume nicht gefunden.');
  const next = { ...flower, ...input };
  const result = db.prepare(`
    UPDATE flowers SET text = ?, flower_type = ?, color = ?, emoji = ?, updated_at = ?
    WHERE id = ? AND from_user = ? AND opened_at IS NULL`)
    .run(next.text, next.flower_type, next.color, next.emoji, now(), flower.id, me);
  if (result.changes === 0) fail(409, 'Diese Blume wurde schon geöffnet und kann nicht mehr bearbeitet werden.');
  const updated = getFlower(flower.id, roomId);
  broadcast(roomId, 'flower', (viewer) => serializeFlower(updated, viewer));
  res.json(serializeFlower(updated, me));
}));

api.delete('/flowers/:id', requireMember, writeLimit, wrap((req, res) => {
  const { id: me, room_id: roomId } = req.member;
  const flower = getFlower(req.params.id, roomId);
  if (!flower || flower.from_user !== me) fail(404, 'Blume nicht gefunden.');
  const result = db.prepare('DELETE FROM flowers WHERE id = ? AND from_user = ? AND opened_at IS NULL').run(flower.id, me);
  if (result.changes === 0) fail(409, 'Diese Blume wurde schon geöffnet und kann nicht mehr gelöscht werden.');
  broadcast(roomId, 'flower-deleted', { id: flower.id });
  res.json({ ok: true });
}));

api.post('/flowers/:id/open', requireMember, wrap((req, res) => {
  const { id: me, room_id: roomId } = req.member;
  const flower = getFlower(req.params.id, roomId);
  if (!flower || flower.to_user !== me) fail(404, 'Blume nicht gefunden.');
  db.prepare('UPDATE flowers SET opened_at = ? WHERE id = ? AND opened_at IS NULL').run(now(), flower.id);
  const opened = getFlower(flower.id, roomId);
  broadcast(roomId, 'flower', (viewer) => serializeFlower(opened, viewer));
  res.json(serializeFlower(opened, me));
}));

// ---------- Echtzeit & Push ----------

api.get('/events', requireMember, subscribe);

api.get('/push/key', (_req, res) => res.json({ publicKey: vapidPublicKey }));

api.post('/push/subscribe', requireMember, wrap((req, res) => {
  if (!saveSubscription(req.member.id, req.body.subscription)) fail(400, 'Ungültiges Push-Abo.');
  res.json({ ok: true });
}));

api.post('/push/unsubscribe', requireMember, wrap((req, res) => {
  removeSubscription(req.member.id, String(req.body.endpoint ?? ''));
  res.json({ ok: true });
}));

api.use((_req, _res, next) => next(new HttpError(404, 'Nicht gefunden.')));
api.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Ungültige Anfrage.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Anfrage zu groß.' });
  console.error(err);
  res.status(500).json({ error: 'Da ist etwas schiefgelaufen. Bitte versuch es nochmal.' });
});

app.use('/api', api);

// ---------- Frontend ----------

if (DEV) {
  const { createServer } = await import('vite');
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('Kein Build gefunden. Bitte zuerst "npm run build" ausführen.');
    process.exit(1);
  }
  app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(dist, {
    index: false,
    setHeaders(res, file) {
      if (/(sw\.js|\.webmanifest|theme-init\.js)$/.test(file)) res.set('Cache-Control', 'no-cache');
    },
  }));
  const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    res.set('Cache-Control', 'no-cache').type('html').send(indexHtml);
  });
}

app.listen(PORT, () => {
  console.log(`💐 Liebesstrauß läuft auf http://localhost:${PORT}${DEV ? ' (Entwicklungsmodus)' : ''}`);
});
