// ─── Realtime Database: sobe, matchmaking, potezi, chat, glasanje ────────────
import {
  ref, set, get, update, remove, push, onValue, onDisconnect,
  runTransaction, serverTimestamp,
} from 'firebase/database';
import { rtdb } from './config.js';
import * as engine from '../game/engine.js';
import { cleanText } from '../game/profanity.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez 0/O/1/I
const genCode = () =>
  Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const genRoomId = () => push(ref(rtdb, 'rooms')).key;

const playerInfo = (user, profile) => ({
  uid: user.uid,
  name: profile?.name || user.displayName || 'Igrač',
  photo: profile?.photo || user.photoURL || '',
  elo: profile?.elo ?? 1000,
});

// ── Sobe ──
/** Kreiraj privatnu sobu; vraća { roomId, code }. */
export async function createPrivateRoom(user, profile) {
  const roomId = genRoomId();
  const code = genCode();
  await set(ref(rtdb, `rooms/${roomId}`), {
    meta: { hostUid: user.uid, createdAt: serverTimestamp(), mode: 'private', code, status: 'lobby' },
    players: { 0: playerInfo(user, profile) },
  });
  await set(ref(rtdb, `codes/${code}`), { roomId, hostUid: user.uid });
  return { roomId, code };
}

/** Uđi u sobu preko 6-znakovnog koda. */
export async function joinByCode(code, user, profile) {
  const snap = await get(ref(rtdb, `codes/${code.toUpperCase().trim()}`));
  if (!snap.exists()) throw new Error('Soba s tim kodom ne postoji.');
  const { roomId } = snap.val();
  await joinRoom(roomId, user, profile);
  return roomId;
}

/** Zauzmi slobodno sjedište (transakcija — bez duplih sjedišta). */
export async function joinRoom(roomId, user, profile) {
  const res = await runTransaction(ref(rtdb, `rooms/${roomId}/players`), (players) => {
    players = players || {};
    const seats = Object.values(players);
    if (seats.some((p) => p && p.uid === user.uid)) return players; // već unutra
    if (seats.filter(Boolean).length >= 4) return; // puna soba → abort
    for (let i = 0; i < 4; i++) {
      if (!players[i]) { players[i] = playerInfo(user, profile); break; }
    }
    return players;
  });
  if (!res.committed) throw new Error('Soba je puna.');
  // Ako igrač izgubi vezu u lobby-ju, oslobodi sjedište
  const mySeat = Object.entries(res.snapshot.val() || {}).find(([, p]) => p?.uid === user.uid)?.[0];
  if (mySeat != null) {
    const seatRef = ref(rtdb, `rooms/${roomId}/players/${mySeat}`);
    onDisconnect(seatRef).remove();
  }
}

/** Potvrdi prisustvo nakon starta igre (sjedište se više ne briše na disconnect). */
export async function cancelSeatOnDisconnect(roomId, seat) {
  await onDisconnect(ref(rtdb, `rooms/${roomId}/players/${seat}`)).cancel();
}

export async function leaveRoom(roomId, user) {
  const snap = await get(ref(rtdb, `rooms/${roomId}/players`));
  const players = snap.val() || {};
  for (const [seat, p] of Object.entries(players)) {
    if (p?.uid === user.uid) await remove(ref(rtdb, `rooms/${roomId}/players/${seat}`));
  }
}

export function watchRoom(roomId, cb) {
  return onValue(ref(rtdb, `rooms/${roomId}`), (s) => cb(s.exists() ? { id: roomId, ...s.val() } : null));
}

// ── Start igre i potezi ──
/** Host pokreće partiju kad su sva 4 igrača u sobi. */
export async function startGame(roomId, room) {
  const players = [0, 1, 2, 3].map((i) => room.players[i]);
  if (players.some((p) => !p)) throw new Error('Nema dovoljno igrača.');
  const game = engine.createGame(players);
  game.isPrivate = room.meta?.mode === 'private';
  await update(ref(rtdb, `rooms/${roomId}`), { game, 'meta/status': 'playing', votes: null });
}

/**
 * Upis poteza kroz RTDB transakciju: engine validira i primjenjuje.
 * Nevalidan potez (ili zastarjelo stanje) se odbija — niko ne može varati
 * više nego što mu validacija na svim klijentima dozvoli.
 */
export async function submitMove(roomId, seat, move) {
  await runTransaction(ref(rtdb, `rooms/${roomId}/game`), (raw) => {
    if (!raw) return raw;
    const g = engine.normalize(raw);
    try {
      return engine.applyMove(g, seat, move);
    } catch {
      return; // abort — nevalidno
    }
  });
}

export async function submitContract(roomId, seat, contract) {
  await runTransaction(ref(rtdb, `rooms/${roomId}/game`), (raw) => {
    if (!raw) return raw;
    const g = engine.normalize(raw);
    try {
      return engine.chooseContract(g, seat, contract);
    } catch {
      return;
    }
  });
}

export async function submitContinue(roomId) {
  await runTransaction(ref(rtdb, `rooms/${roomId}/game`), (raw) => {
    if (!raw || raw.status !== 'dealOver') return raw;
    return engine.continueToNextDeal(engine.normalize(raw));
  });
}

/** Automatski potez za igrača kojem je istekao timer (zove ga i host kao fallback). */
export async function submitTimeout(roomId, seat) {
  await runTransaction(ref(rtdb, `rooms/${roomId}/game`), (raw) => {
    if (!raw) return raw;
    const g = engine.normalize(raw);
    if (Date.now() < (g.turnDeadline || 0)) return; // još nije isteklo → abort
    const am = engine.autoMove(g, seat);
    if (!am) return;
    try {
      return am.type === 'contract' ? engine.chooseContract(g, seat, am.value) : engine.applyMove(g, seat, am.value);
    } catch {
      return;
    }
  });
}

/** Rematch: resetuj igru s istim igračima. */
export async function rematch(roomId, room) {
  const players = [0, 1, 2, 3].map((i) => room.players[i]);
  const game = engine.createGame(players);
  game.isPrivate = room.meta?.mode === 'private';
  await update(ref(rtdb, `rooms/${roomId}`), { game, 'meta/status': 'playing', votes: null });
}

// ── Chat ──
export async function sendChat(roomId, user, text) {
  const clean = cleanText(text.slice(0, 200));
  await push(ref(rtdb, `rooms/${roomId}/chat`), {
    uid: user.uid, name: user.displayName || 'Igrač', text: clean, at: serverTimestamp(),
  });
}

export function watchChat(roomId, cb) {
  return onValue(ref(rtdb, `rooms/${roomId}/chat`), (s) => {
    const val = s.val() || {};
    cb(Object.entries(val).map(([id, m]) => ({ id, ...m })).sort((a, b) => (a.at || 0) - (b.at || 0)));
  });
}

// ── Glasanje (restart / napuštanje) ──
export async function castVote(roomId, type, uid, value = true) {
  await set(ref(rtdb, `rooms/${roomId}/votes/${type}/${uid}`), value);
}

export async function clearVotes(roomId, type) {
  await remove(ref(rtdb, `rooms/${roomId}/votes/${type}`));
}

// ── Javni matchmaking ──
/** Stani u red; sistem automatski spaja 4 igrača u sobu. */
export async function joinQueue(user, profile) {
  const meRef = ref(rtdb, `matchmaking/queue/${user.uid}`);
  await set(meRef, { ...playerInfo(user, profile), ts: Date.now() });
  onDisconnect(meRef).remove();
}

export async function leaveQueue(user) {
  await remove(ref(rtdb, `matchmaking/queue/${user.uid}`));
}

/**
 * Slušaj red čekanja. Najstariji čekalac postaje "organizator": kad su 4 u
 * redu, kreira sobu i svima upiše dodjelu. Svi slušaju matchmaking/assign/$uid.
 */
export function watchQueue(user, profile, onAssigned) {
  const unsubAssign = onValue(ref(rtdb, `matchmaking/assign/${user.uid}`), async (s) => {
    if (s.exists()) {
      const roomId = s.val();
      await remove(ref(rtdb, `matchmaking/assign/${user.uid}`));
      await joinRoom(roomId, user, profile);
      onAssigned(roomId);
    }
  });

  const unsubQueue = onValue(ref(rtdb, 'matchmaking/queue'), async (s) => {
    const q = Object.entries(s.val() || {})
      .map(([uid, v]) => ({ uid, ...v }))
      .sort((a, b) => a.ts - b.ts || a.uid.localeCompare(b.uid));
    if (q.length < 4 || q[0].uid !== user.uid) return; // samo najstariji organizuje

    const four = q.slice(0, 4);
    const roomId = genRoomId();
    await set(ref(rtdb, `rooms/${roomId}`), {
      meta: { hostUid: user.uid, createdAt: serverTimestamp(), mode: 'public', status: 'lobby' },
      players: {},
    });
    const updates = {};
    for (const p of four) {
      updates[`matchmaking/assign/${p.uid}`] = roomId;
      updates[`matchmaking/queue/${p.uid}`] = null;
    }
    await update(ref(rtdb), updates);
  });

  return () => { unsubAssign(); unsubQueue(); };
}

/** Zatvori sobu (izglasano napuštanje ili kraj). */
export async function closeRoom(roomId) {
  await update(ref(rtdb, `rooms/${roomId}/meta`), { status: 'closed' });
}
