// ─── Špil od 52 karte ───────────────────────────────────────────────────────
// Karta je string ID: npr. "H12" = dama herc (suit + rank).
// Rank: 2–10, 11=J (dečko), 12=Q (dama), 13=K (kralj), 14=A (as).

export const SUITS = ['S', 'H', 'D', 'C']; // pik, herc, karo, tref
export const SUIT_INFO = {
  S: { symbol: '♠', name: 'Pik', color: 'black' },
  H: { symbol: '♥', name: 'Herc', color: 'red' },
  D: { symbol: '♦', name: 'Karo', color: 'red' },
  C: { symbol: '♣', name: 'Tref', color: 'black' },
};
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export const cardId = (s, r) => s + r;
export const suitOf = (id) => id[0];
export const rankOf = (id) => Number(id.slice(1));
export const rankLabel = (r) => RANK_LABEL[r] || String(r);

/** Puni špil od 52 karte. */
export function buildDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(cardId(s, r));
  return deck;
}

/** Fisher–Yates miješanje (in-place na kopiji). */
export function shuffle(deck, rng = Math.random) {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Podijeli 4 ruke po 13 karata, sortirane za prikaz. */
export function dealHands(rng = Math.random) {
  const deck = shuffle(buildDeck(), rng);
  const hands = [[], [], [], []];
  deck.forEach((c, i) => hands[i % 4].push(c));
  return hands.map(sortHand);
}

/** Sortiraj ruku po boji pa po jačini (za lijep prikaz u lepezi). */
export function sortHand(hand) {
  const suitOrder = { S: 0, H: 1, C: 2, D: 3 }; // naizmjenične boje
  return [...hand].sort((a, b) => {
    const ds = suitOrder[suitOf(a)] - suitOrder[suitOf(b)];
    return ds !== 0 ? ds : rankOf(a) - rankOf(b);
  });
}

/** Sljedeći rank u Lora nizu (kružno: A → 2). */
export const nextRank = (r) => (r === 14 ? 2 : r + 1);
