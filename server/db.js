import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'liebesstrauss.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS rooms (
    id          TEXT PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id              TEXT PRIMARY KEY,
    room_id         TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    pin_hash        TEXT NOT NULL,
    pin_salt        TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS members_room ON members(room_id);

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    member_id   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL,
    last_seen   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS flowers (
    id           TEXT PRIMARY KEY,
    room_id      TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    from_user    TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    to_user      TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    text         TEXT NOT NULL,
    flower_type  TEXT NOT NULL,
    color        TEXT NOT NULL,
    emoji        TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT,
    opened_at    TEXT
  );
  CREATE INDEX IF NOT EXISTS flowers_room ON flowers(room_id, created_at);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint    TEXT PRIMARY KEY,
    member_id   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );
`);

// Kleine Migrationen für bestehende Datenbanken
const memberColumns = db.prepare('PRAGMA table_info(members)').all().map((c) => c.name);
if (!memberColumns.includes('lockouts')) {
  db.exec('ALTER TABLE members ADD COLUMN lockouts INTEGER NOT NULL DEFAULT 0');
}

/** Runs fn inside a transaction (node:sqlite has no helper for it). */
export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getMeta(key) {
  return db.prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value ?? null;
}

export function setMeta(key, value) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}
