import webpush from 'web-push';
import { db, getMeta, setMeta } from './db.js';
import { now } from './auth.js';

// VAPID-Schlüssel: aus der Umgebung oder beim ersten Start erzeugt und in der DB gespeichert.
let publicKey = process.env.VAPID_PUBLIC_KEY || getMeta('vapid_public');
let privateKey = process.env.VAPID_PRIVATE_KEY || getMeta('vapid_private');
if (!publicKey || !privateKey) {
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  setMeta('vapid_public', publicKey);
  setMeta('vapid_private', privateKey);
}
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:liebesstrauss@example.com', publicKey, privateKey);

export const vapidPublicKey = publicKey;

export function saveSubscription(memberId, sub) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return false;
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return false;
  db.prepare(`
    INSERT INTO push_subscriptions (endpoint, member_id, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth`)
    .run(sub.endpoint, memberId, sub.keys.p256dh, sub.keys.auth, now());
  return true;
}

export function removeSubscription(memberId, endpoint) {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND member_id = ?').run(endpoint, memberId);
}

export async function sendPush(memberId, payload) {
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE member_id = ?').all(memberId);
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24, urgency: 'normal' },
      );
    } catch (err) {
      // Abo abgelaufen oder widerrufen -> aufräumen
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(s.endpoint);
      } else {
        console.warn('Push fehlgeschlagen:', err.statusCode || err.message);
      }
    }
  }));
}
