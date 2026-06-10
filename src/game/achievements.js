// ─── Achievements ───────────────────────────────────────────────────────────
export const ACHIEVEMENTS = {
  first_win:  { name: 'Prva pobjeda',     icon: '🏆', desc: 'Pobijedi svoju prvu partiju.' },
  wins_10:    { name: '10 pobjeda',       icon: '🥉', desc: 'Pobijedi 10 partija.' },
  wins_50:    { name: '50 pobjeda',       icon: '🥈', desc: 'Pobijedi 50 partija.' },
  wins_100:   { name: '100 pobjeda',      icon: '🥇', desc: 'Pobijedi 100 partija.' },
  perfect:    { name: 'Savršena partija', icon: '💎', desc: 'Pobijedi bez ijednog primljenog štiha.' },
  streaker:   { name: 'Streaker',         icon: '🔥', desc: '5 pobjeda zaredom.' },
  socijalist: { name: 'Socijalist',       icon: '🤝', desc: 'Odigraj 10 partija s prijateljima (privatne sobe).' },
};

/**
 * Vrati nove achievemente nakon partije.
 * @param {object} stats — ažurirane statistike korisnika (wins, streak, friendGames…)
 * @param {object} gameResult — { won, tricksTaken }
 * @param {object} unlocked — već otključani { id: timestamp }
 */
export function checkAchievements(stats, gameResult, unlocked = {}) {
  const earned = [];
  const add = (id) => { if (!unlocked[id]) earned.push(id); };

  if (gameResult.won) {
    add('first_win');
    if (stats.wins >= 10) add('wins_10');
    if (stats.wins >= 50) add('wins_50');
    if (stats.wins >= 100) add('wins_100');
    if (gameResult.tricksTaken === 0) add('perfect');
    if (stats.streak >= 5) add('streaker');
  }
  if ((stats.friendGames || 0) >= 10) add('socijalist');
  return earned;
}
