// ─── ELO rejting (pairwise, 4 igrača) ───────────────────────────────────────
// Svaki igrač se poredi sa svakim protivnikom: bolji plasman = pobjeda u paru.

const K = 16; // K po paru → maksimalna promjena ±48

/**
 * @param {{uid:string, elo:number, score:number}[]} players — score = bodovi u Lori (manje je bolje)
 * @returns {Object<string, number>} delta ELO po uid-u
 */
export function eloDeltas(players) {
  const deltas = {};
  for (const p of players) deltas[p.uid] = 0;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j];
      const expA = 1 / (1 + 10 ** ((b.elo - a.elo) / 400));
      const sA = a.score < b.score ? 1 : a.score > b.score ? 0 : 0.5; // manje bodova = bolje
      const d = Math.round(K * (sA - expA));
      deltas[a.uid] += d;
      deltas[b.uid] -= d;
    }
  }
  return deltas;
}

// ─── Rang bedževi ───
export const RANKS = [
  { min: 0,    name: 'Početnik', color: '#8d99ae', icon: '🃟' },
  { min: 1100, name: 'Amater',   color: '#52b788', icon: '♣' },
  { min: 1300, name: 'Pro',      color: '#4895ef', icon: '♦' },
  { min: 1550, name: 'Majstor',  color: '#b5179e', icon: '♥' },
  { min: 1800, name: 'Legenda',  color: '#f4a261', icon: '♠' },
];

export function rankFor(elo) {
  let r = RANKS[0];
  for (const cand of RANKS) if (elo >= cand.min) r = cand;
  return r;
}
