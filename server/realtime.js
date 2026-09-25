// Echtzeit per Server-Sent Events: jeder Raum hat eine Menge offener Verbindungen.
const rooms = new Map(); // room_id -> Set<{ memberId, res }>

export function subscribe(req, res) {
  const { id: memberId, room_id: roomId } = req.member;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  const client = { memberId, res };
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(client);

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    const set = rooms.get(roomId);
    set?.delete(client);
    if (set && set.size === 0) rooms.delete(roomId);
  });
}

/**
 * Schickt ein Ereignis an alle Verbindungen eines Raums.
 * `payloadFor(memberId)` darf je Empfänger unterschiedliche Daten liefern
 * (z. B. wird der Text ungeöffneter Blumen dem Empfänger nicht verraten).
 */
export function broadcast(roomId, event, payloadFor) {
  const set = rooms.get(roomId);
  if (!set) return;
  for (const { memberId, res } of set) {
    const data = typeof payloadFor === 'function' ? payloadFor(memberId) : payloadFor;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

/** Ist das Mitglied gerade mit offener App verbunden? */
export function isOnline(roomId, memberId) {
  const set = rooms.get(roomId);
  if (!set) return false;
  for (const c of set) if (c.memberId === memberId) return true;
  return false;
}
