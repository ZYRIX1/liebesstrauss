import crypto from 'node:crypto';
import { db } from './db.js';

export const SESSION_COOKIE = 'ls_session';
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 400; // ~13 Monate
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000; // verdoppelt sich bei jeder weiteren Sperre …
const MAX_LOCK_MS = 24 * 60 * 60 * 1000; // … bis höchstens 24 Stunden

const formatWait = (ms) => {
  const min = Math.ceil(ms / 60000);
  return min < 90 ? `${min} Min.` : `${Math.ceil(min / 60)} Std.`;
};

export const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

// Lesbarer Code ohne verwechselbare Zeichen (kein 0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newRoomCode(length = 8) {
  let out = '';
  for (const byte of crypto.randomBytes(length)) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return out;
}
export const normalizeCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return { hash, salt };
}

function pinMatches(pin, member) {
  const { hash } = hashPin(pin, member.pin_salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(member.pin_hash, 'hex'));
}

export const isValidPin = (pin) => /^\d{4,8}$/.test(String(pin ?? ''));

/**
 * Prüft die PIN mit Sperre nach zu vielen Fehlversuchen.
 * Gibt { ok: true } oder { ok: false, error } zurück.
 */
export function verifyPin(member, pin) {
  const t = Date.now();
  if (member.locked_until > t) {
    return { ok: false, error: `Zu viele Versuche. Bitte in ${formatWait(member.locked_until - t)} erneut probieren.` };
  }
  if (isValidPin(pin) && pinMatches(pin, member)) {
    db.prepare('UPDATE members SET failed_attempts = 0, locked_until = 0, lockouts = 0 WHERE id = ?').run(member.id);
    return { ok: true };
  }
  const failed = member.failed_attempts + 1;
  if (failed >= MAX_FAILED) {
    const lockMs = Math.min(LOCK_MS * 2 ** (member.lockouts ?? 0), MAX_LOCK_MS);
    db.prepare('UPDATE members SET failed_attempts = 0, locked_until = ?, lockouts = lockouts + 1 WHERE id = ?').run(t + lockMs, member.id);
    return { ok: false, error: `Zu viele Versuche. Der Zugang ist für ${formatWait(lockMs)} gesperrt.` };
  }
  db.prepare('UPDATE members SET failed_attempts = ? WHERE id = ?').run(failed, member.id);
  return { ok: false, error: `Falsche PIN. Noch ${MAX_FAILED - failed} Versuch(e).` };
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function createSession(res, memberId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, member_id, created_at, last_seen) VALUES (?, ?, ?, ?)')
    .run(sha256(token), memberId, now(), now());
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: res.req.secure,
    maxAge: SESSION_MAX_AGE_S * 1000,
    path: '/',
  });
}

export function destroySession(req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/** Hängt req.member an, falls eine gültige Sitzung existiert. */
export function loadSession(req, _res, next) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    const tokenHash = sha256(token);
    const row = db.prepare(`
      SELECT m.id, m.room_id, m.name, s.last_seen
      FROM sessions s JOIN members m ON m.id = s.member_id
      WHERE s.token_hash = ?`).get(tokenHash);
    if (row) {
      req.member = { id: row.id, room_id: row.room_id, name: row.name };
      // last_seen höchstens stündlich aktualisieren
      if (Date.now() - Date.parse(row.last_seen) > 3600_000) {
        db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').run(now(), tokenHash);
      }
    }
  }
  next();
}

export function requireMember(req, res, next) {
  if (!req.member) return res.status(401).json({ error: 'Nicht angemeldet.' });
  next();
}

/** Sehr einfacher In-Memory-Limiter pro IP und Schlüssel. */
export function rateLimit({ key, limit, windowMs }) {
  const hits = new Map();
  setInterval(() => {
    const t = Date.now();
    for (const [k, v] of hits) if (v.reset < t) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const id = `${key}:${req.ip}`;
    const t = Date.now();
    let entry = hits.get(id);
    if (!entry || entry.reset < t) {
      entry = { count: 0, reset: t + windowMs };
      hits.set(id, entry);
    }
    entry.count++;
    if (entry.count > limit) {
      return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warte kurz.' });
    }
    next();
  };
}

/**
 * Schutz gegen CSRF: schreibende Anfragen müssen JSON sein und
 * (falls vorhanden) vom selben Origin kommen.
 */
export function sameOriginWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ error: 'Ungültige Herkunft.' });
      }
    } catch {
      return res.status(403).json({ error: 'Ungültige Herkunft.' });
    }
  }
  if (req.method !== 'DELETE' && !req.is('application/json')) {
    return res.status(415).json({ error: 'JSON erwartet.' });
  }
  next();
}
