// ─── Realtime Database: sobe, matchmaking, potezi, chat, glasanje, botovi ────
import {
  ref, set, get, update, remove, push, onValue, onDisconnect,
  runTransaction, serverTimestamp,
} from 'firebase/database';
import { rtdb } from './config.js';
import * as engine from '../game/engine.js';
import { cleanText } from '../game/profanity.js';
import { makeBot } from '../game/bots.js';

export const QUEUE_BOT_MS = 120_000; // nakon 2 min čekanja dodaju se botovi

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

const sortQueue = (val) =>
  Object.entries(val || {})
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => a.ts - b.ts || a.uid.localeCompare(b.uid));

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

/** Soba protiv botova — odmah puna, partija ne ide u statistike. */
export async function createBotRoom(user, profile) {
  const roomId = genRoomId();
  await set(ref(rtdb, `rooms/${roomId}`), {
    meta: { hostUid: user.uid, createdAt: serverTimestamp(), mode: 'bots', bots: true, status: 'lobby' },
    players: {
      0: playerInfo(user, profile),
      1: makeBot(1, 0),
      2: makeBot(2, 1),
      3: makeBot(3, 2),
    },
  });
  return roomId;
}

/** Host popunjava prazna sjedišta botovima. */
export async function fillWithBots(roomId, room) {
  const updates = {};
  let b = 0;
  for (let i = 0; i < 4; i++) {
    if (!room.players?.[i]) updates[`players/${i}`] = makeBot(i, b++);
  }
  if (Object.keys(updates).length) await update(ref(rtdb, `rooms/${roomId}`), updates);
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
    onDisconnect(ref(rtdb, `rooms/${roomId}/players/${mySeat}`)).remove();
  }
}

/** Nakon starta igre sjedište se više ne briše na disconnect (reconnect moguć). */
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
/** Host pokreće partiju kad su sva 4 sjedišta popunjena. */
export async function startGame(roomId, room) {
  const players = [0, 1, 2, 3].map((i) => room.players[i]);
  if (players.some((p) => !p)) throw new Error('Nema dovoljno igrača.');
  const game = engine.createGame(players);
  game.isPrivate = room.meta?.mode === 'private';
  game.hasBots = players.some((p) => p.isBot);
  await update(ref(rtdb, `rooms/${roomId}`), { game, 'meta/status': 'playing', votes: null });
}

/**
 * Upis poteza kroz RTDB transakciju: engine validira i primjenjuje.
 * Nevalidan potez se odbija na svim klijentima.
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
  game.hasBots = players.some((p) => p?.isBot);
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

/** Zatvori sobu (izglasano napuštanje ili kraj). */
export async function closeRoom(roomId) {
  await update(ref(rtdb, `rooms/${roomId}/meta`), { status: 'closed' });
}

// ── Javni matchmaking ──
/** Stani u red; sistem spaja 4 igrača, a nakon 2 min dodaje botove. */
export async function joinQueue(user, profile) {
  const meRef = ref(rtdb, `matchmaking/queue/${user.uid}`);
  await set(meRef, { ...playerInfo(user, profile), ts: Date.now() });
  onDisconnect(meRef).remove();
}

export async function leaveQueue(user) {
  await remove(ref(rtdb, `matchmaking/queue/${user.uid}`));
}

async function createQueueRoom(user, bots) {
  const roomId = genRoomId();
  await set(ref(rtdb, `rooms/${roomId}`), {
    meta: { hostUid: user.uid, createdAt: serverTimestamp(), mode: 'public', bots, status: 'lobby' },
    players: {},
  });
  return roomId;
}

/** Dodijeli sobu članovima reda. Svako sam briše SVOJ queue zapis kad primi dodjelu. */
async function assignRoom(members, roomId) {
  for (const p of members) {
    await set(ref(rtdb, `matchmaking/assign/${p.uid}`), roomId);
  }
}

/**
 * Slušaj red čekanja. Najstariji čekalac je "organizator": kad su 4 u redu,
 * kreira sobu i svima upiše dodjelu (matchmaking/assign/$uid).
 */
export function watchQueue(user, profile, onAssigned) {
  const unsubAssign = onValue(ref(rtdb, `matchmaking/assign/${user.uid}`), async (s) => {
    if (!s.exists()) return;
    const roomId = s.val();
    await remove(ref(rtdb, `matchmaking/assign/${user.uid}`));
    await leaveQueue(user); // svoj zapis brišem sam (rules dozvoljavaju samo to)
    await joinRoom(roomId, user, profile);
    onAssigned(roomId);
  });

  const unsubQueue = onValue(ref(rtdb, 'matchmaking/queue'), async (s) => {
    const q = sortQueue(s.val());
    if (q.length < 4 || q[0].uid !== user.uid) return; // samo najstariji organizuje
    const roomId = await createQueueRoom(user, false);
    await assignRoom(q.slice(0, 4), roomId);
  });

  return () => { unsubAssign(); unsubQueue(); };
}

/**
 * Isteklo je čekanje (2 min): najstariji u redu kreira sobu za sve prisutne,
 * a Lobby prazna mjesta popuni botovima. Vraća true ako je soba kreirana.
 */
export async function forceBotMatch(user) {
  const s = await get(ref(rtdb, 'matchmaking/queue'));
  const q = sortQueue(s.val());
  if (!q.length || q[0].uid !== user.uid) return false; // nisam najstariji — čekam dodjelu
  const roomId = await createQueueRoom(user, true);
  await assignRoom(q.slice(0, 4), roomId);
  return true;
}
