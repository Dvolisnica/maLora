// ─── Firestore: profili, statistike, leaderboard, achievements ──────────────
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where,
  orderBy, limit, getDocs, onSnapshot, addDoc, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from './config.js';
import { eloDeltas } from '../game/elo.js';
import { checkAchievements } from '../game/achievements.js';

const START_ELO = 1000;

/** ISO sedmica, npr. "2026-W24" — ključ za sedmični leaderboard. */
export function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Kreiraj profil pri prvom loginu / osvježi ime i avatar s Google naloga. */
export async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: user.displayName || 'Igrač',
      photo: user.photoURL || '',
      elo: START_ELO,
      games: 0, wins: 0, losses: 0,
      totalPoints: 0, streak: 0, bestStreak: 0,
      friendGames: 0, weeklyWins: 0, weekKey: weekKey(),
      achievements: {}, last20: [],
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, { name: user.displayName || snap.data().name, photo: user.photoURL || '' });
  }
}

export function watchProfile(uid, cb) {
  return onSnapshot(doc(db, 'users', uid), (s) => cb(s.exists() ? { uid, ...s.data() } : null));
}

export async function getProfile(uid) {
  const s = await getDoc(doc(db, 'users', uid));
  return s.exists() ? { uid, ...s.data() } : null;
}

/**
 * Nakon partije svaki klijent ažurira ISKLJUČIVO svoj profil
 * (security rules ne dozvoljavaju upis u tuđe). ELO se računa
 * deterministički iz istog stanja igre → svi dobiju iste delte.
 * @returns {string[]} novi achievementi (za toast)
 */
export async function updateMyStatsAfterGame(uid, game, ranking) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const me = snap.data();

  const seat = game.players.findIndex((p) => p.uid === uid);
  const myScore = game.scores[seat] || 0;
  const place = ranking.findIndex((r) => r.seat === seat) + 1;
  const won = place === 1;

  const deltas = eloDeltas(
    game.players.map((p, i) => ({ uid: p.uid, elo: p.elo ?? START_ELO, score: game.scores[i] || 0 }))
  );
  const newElo = Math.max(0, (me.elo ?? START_ELO) + (deltas[uid] || 0));

  const wk = weekKey();
  const streak = won ? (me.streak || 0) + 1 : 0;
  const stats = {
    elo: newElo,
    games: (me.games || 0) + 1,
    wins: (me.wins || 0) + (won ? 1 : 0),
    losses: (me.losses || 0) + (won ? 0 : 1),
    totalPoints: (me.totalPoints || 0) + myScore,
    streak,
    bestStreak: Math.max(me.bestStreak || 0, streak),
    friendGames: (me.friendGames || 0) + (game.isPrivate ? 1 : 0),
    weekKey: wk,
    weeklyWins: (me.weekKey === wk ? me.weeklyWins || 0 : 0) + (won ? 1 : 0),
    last20: [
      ...(me.last20 || []).slice(-19),
      { ts: Date.now(), place, score: myScore, elo: newElo },
    ],
  };

  const newAch = checkAchievements(
    { ...me, ...stats },
    { won, tricksTaken: game.tricksTotal?.[seat] ?? 0 },
    me.achievements || {}
  );
  const achievements = { ...(me.achievements || {}) };
  for (const id of newAch) achievements[id] = Date.now();

  await updateDoc(ref, { ...stats, achievements });
  return newAch;
}

/** Arhiviraj završenu partiju (upisuje samo host da ne bude duplikata). */
export async function archiveMatch(game, ranking) {
  await addDoc(collection(db, 'matches'), {
    playerUids: game.players.map((p) => p.uid),
    players: game.players.map((p, i) => ({ uid: p.uid, name: p.name, score: game.scores[i] || 0 })),
    winnerUid: game.players[ranking[0].seat].uid,
    isPrivate: !!game.isPrivate,
    finishedAt: serverTimestamp(),
  });
}

/** Globalni leaderboard — top 50 po ELO. */
export async function getGlobalLeaderboard() {
  const q = query(collection(db, 'users'), orderBy('elo', 'desc'), limit(50));
  return (await getDocs(q)).docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/** Sedmični leaderboard — top 50 po pobjedama ove sedmice. */
export async function getWeeklyLeaderboard() {
  const q = query(
    collection(db, 'users'),
    where('weekKey', '==', weekKey()),
    orderBy('weeklyWins', 'desc'),
    limit(50)
  );
  return (await getDocs(q)).docs.map((d) => ({ uid: d.id, ...d.data() }));
}
