// PIN vergessen? Auf dem Server ausführen:
//   npm run reset-pin -- <RAUMCODE> <NAME> <NEUE_PIN>
//   (Docker: docker compose exec app node scripts/reset-pin.mjs <RAUMCODE> <NAME> <NEUE_PIN>)
import { db } from '../server/db.js';
import { hashPin, isValidPin, normalizeCode } from '../server/auth.js';

const [code, name, pin] = process.argv.slice(2);
if (!code || !name || !pin) {
  console.log('Aufruf: npm run reset-pin -- <RAUMCODE> <NAME> <NEUE_PIN>');
  process.exit(1);
}
if (!isValidPin(pin)) {
  console.error('Die PIN muss aus 4–8 Ziffern bestehen.');
  process.exit(1);
}

const room = db.prepare('SELECT id FROM rooms WHERE code = ?').get(normalizeCode(code));
if (!room) {
  console.error('Raum nicht gefunden.');
  process.exit(1);
}
const members = db.prepare('SELECT id, name FROM members WHERE room_id = ?').all(room.id);
const member = members.find((m) => m.name.toLowerCase() === name.trim().toLowerCase());
if (!member) {
  console.error(`Person nicht gefunden. Im Raum sind: ${members.map((m) => m.name).join(', ')}`);
  process.exit(1);
}

const { hash, salt } = hashPin(pin);
db.prepare('UPDATE members SET pin_hash = ?, pin_salt = ?, failed_attempts = 0, locked_until = 0, lockouts = 0 WHERE id = ?')
  .run(hash, salt, member.id);
console.log(`✓ Neue PIN für ${member.name} gesetzt.`);
