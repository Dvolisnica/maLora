// ─── Lora game engine (čiste funkcije, bez side-effecta) ────────────────────
// Stanje igre je običan JSON koji se sinhronizuje kroz Firebase RTDB.
// Svaki klijent validira poteze istim kodom → nevalidan potez je nemoguć.
//
// Tok: 28 dijeljenja. Dilerom se rotira; diler bira jedan od svojih
// još neodigranih kontrata. Pobjeđuje igrač s najmanje bodova.

import { dealHands, sortHand, suitOf, rankOf, nextRank, SUITS } from './deck.js';
import { CONTRACT_ORDER, scoreTrickDeal, scoreLoraDeal } from './contracts.js';

export const TURN_MS = 30_000; // 30 sekundi po potezu
export const TOTAL_DEALS = 28;
export const TRICKS_PER_DEAL = 8; // 32 karte / 4 igrača

// RTDB briše null/prazne vrijednosti — normalize() vraća kompletno stanje.
export function normalize(g) {
  if (!g) return null;
  const seats = ['0', '1', '2', '3'];
  const obj4 = (src, def) => {
    const out = {};
    for (const s of seats) out[s] = src && src[s] !== undefined ? src[s] : def();
    return out;
  };
  return {
    ...g,
    hands: obj4(g.hands, () => []),
    taken: obj4(g.taken, () => []),
    tricks: obj4(g.tricks, () => 0),
    scores: obj4(g.scores, () => 0),
    used: obj4(g.used, () => ({})),
    trick: g.trick ? { lead: g.trick.lead, cards: g.trick.cards || {} } : null,
    lastTwo: g.lastTwo || [],
    history: g.history || [],
    lora: g.lora
      ? { ...g.lora, next: g.lora.next || {}, played: g.lora.played || {} }
      : null,
  };
}

/** Nova igra: karte se odmah dijele, pa diler gleda svoju ruku i bira igru. */
export function createGame(players, rng = Math.random) {
  const hands = dealHands(rng);
  return {
    status: 'choosing',
    dealIndex: 0,
    dealerSeat: 0,
    players, // [{uid, name, photo}] po sjedištima 0–3
    hands: { 0: hands[0], 1: hands[1], 2: hands[2], 3: hands[3] },
    scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
    used: { 0: {}, 1: {}, 2: {}, 3: {} },
    history: [],
    tricksTotal: { 0: 0, 1: 0, 2: 0, 3: 0 }, // za achievement "Savršena partija"
    turnDeadline: Date.now() + TURN_MS,
  };
}

/** Kontrati koje diler još može izabrati. */
export function availableContracts(g) {
  const used = g.used[g.dealerSeat] || {};
  return CONTRACT_ORDER.filter((c) => !used[c]);
}

/** Diler je pogledao svoje karte i bira igru → kreće igranje. */
export function chooseContract(g, seat, contract) {
  if (g.status !== 'choosing') throw new Error('Nije faza biranja.');
  if (seat !== g.dealerSeat) throw new Error('Samo diler bira igru.');
  if (!availableContracts(g).includes(contract)) throw new Error('Ta igra je već odigrana.');

  const first = (g.dealerSeat + 1) % 4; // prvi igra desno od dilera (smjer kazaljke)
  const next = { ...g, status: 'playing', contract, trickNo: 0 };

  next.used = { ...g.used, [seat]: { ...(g.used[seat] || {}), [contract]: true } };
  next.taken = { 0: [], 1: [], 2: [], 3: [] };
  next.tricks = { 0: 0, 1: 0, 2: 0, 3: 0 };
  next.lastTwo = [];
  next.turnSeat = first;
  next.turnDeadline = Date.now() + TURN_MS;

  if (contract === 'LORA') {
    next.trick = null;
    next.lora = { startRank: 0, next: {}, played: {}, passes: 0 };
  } else {
    next.lora = null;
    next.trick = { lead: first, cards: {} };
  }
  return next;
}

/** Lista validnih poteza za igrača. ['PASS'] ako u Lori nema poteza. */
export function legalMoves(g, seat) {
  if (g.status !== 'playing' || g.turnSeat !== seat) return [];
  const hand = g.hands[seat] || [];

  if (g.contract === 'LORA') {
    const { startRank, next } = g.lora;
    if (!startRank) return [...hand]; // prva karta određuje početni rank svih nizova
    const ok = hand.filter((c) => {
      const exp = next[suitOf(c)];
      return exp && exp !== 'DONE' && rankOf(c) === exp;
    });
    return ok.length ? ok : ['PASS'];
  }

  // Štih-kontrati: mora se poštovati boja ako je ima
  const cards = g.trick.cards || {};
  const leadCard = cards[g.trick.lead];
  if (!leadCard) return [...hand]; // igrač otvara štih
  const leadSuit = suitOf(leadCard);
  const follow = hand.filter((c) => suitOf(c) === leadSuit);
  return follow.length ? follow : [...hand];
}

export function isLegal(g, seat, move) {
  return legalMoves(g, seat).includes(move);
}

/** Primijeni potez (karta ili 'PASS') → novo stanje. Baca grešku na nevalidan potez. */
export function applyMove(g, seat, move) {
  if (!isLegal(g, seat, move)) throw new Error('Nevalidan potez.');
  return g.contract === 'LORA' ? applyLoraMove(g, seat, move) : applyTrickMove(g, seat, move);
}

// ── Štih-kontrati ──
function applyTrickMove(g, seat, card) {
  const next = structuredClone(g);
  next.hands[seat] = next.hands[seat].filter((c) => c !== card);
  next.trick.cards = { ...next.trick.cards, [seat]: card };
  next.lastMove = { seat, card, at: Date.now() };

  const played = Object.keys(next.trick.cards).length;
  if (played < 4) {
    next.turnSeat = (seat + 1) % 4;
    next.turnDeadline = Date.now() + TURN_MS;
    return next;
  }

  // Štih kompletan → najjača karta tražene boje nosi
  const leadSuit = suitOf(next.trick.cards[next.trick.lead]);
  let winner = next.trick.lead;
  for (let s = 0; s < 4; s++) {
    const c = next.trick.cards[s];
    if (suitOf(c) === leadSuit && rankOf(c) > rankOf(next.trick.cards[winner])) winner = s;
  }
  next.taken[winner] = [...next.taken[winner], ...Object.values(next.trick.cards)];
  next.tricks[winner] = (next.tricks[winner] || 0) + 1;
  next.tricksTotal[winner] = (next.tricksTotal[winner] || 0) + 1;
  if (next.trickNo >= TRICKS_PER_DEAL - 2) next.lastTwo = [...next.lastTwo, winner]; // 7. i 8. štih
  next.lastTrickWinner = winner;
  next.trickNo += 1;

  if (next.trickNo === TRICKS_PER_DEAL) return finishDeal(next, scoreTrickDealArr(next));

  next.trick = { lead: winner, cards: {} };
  next.turnSeat = winner;
  next.turnDeadline = Date.now() + TURN_MS;
  return next;
}

function scoreTrickDealArr(g) {
  return scoreTrickDeal(g.contract, {
    taken: [g.taken[0], g.taken[1], g.taken[2], g.taken[3]],
    tricks: [g.tricks[0], g.tricks[1], g.tricks[2], g.tricks[3]],
    lastTwo: g.lastTwo,
  });
}

// ── Lora (slaganje) ──
function applyLoraMove(g, seat, move) {
  const next = structuredClone(g);
  next.lastMove = { seat, card: move, at: Date.now() };

  if (move === 'PASS') {
    next.turnSeat = (seat + 1) % 4;
    next.turnDeadline = Date.now() + TURN_MS;
    return next;
  }

  const s = suitOf(move), r = rankOf(move);
  next.hands[seat] = next.hands[seat].filter((c) => c !== move);

  if (!next.lora.startRank) {
    // Prva karta: njen rank otvara sve nizove
    next.lora.startRank = r;
    for (const suit of SUITS) next.lora.next[suit] = r;
  }
  next.lora.played[s] = [...(next.lora.played[s] || []), r];
  next.lora.next[s] = next.lora.played[s].length === 8 ? 'DONE' : nextRank(r);

  if (next.hands[seat].length === 0) {
    // Prvi bez karata → kraj dijeljenja
    const counts = [0, 1, 2, 3].map((i) => (next.hands[i] || []).length);
    return finishDeal(next, scoreLoraDeal(counts));
  }
  next.turnSeat = (seat + 1) % 4;
  next.turnDeadline = Date.now() + TURN_MS;
  return next;
}

// ── Kraj dijeljenja / igre ──
function finishDeal(g, pts) {
  const next = g;
  for (let s = 0; s < 4; s++) next.scores[s] = (next.scores[s] || 0) + pts[s];
  next.history = [
    ...next.history,
    { deal: next.dealIndex, contract: next.contract, dealer: next.dealerSeat, pts },
  ];
  next.dealScores = pts;
  next.lastContract = next.contract;
  next.dealIndex += 1;
  next.dealerSeat = (next.dealerSeat + 1) % 4;
  next.hands = { 0: [], 1: [], 2: [], 3: [] };
  next.trick = null;
  next.lora = null;

  if (next.dealIndex >= TOTAL_DEALS) {
    next.status = 'gameOver';
    next.finishedAt = Date.now();
  } else {
    next.status = 'dealOver'; // kratka pauza s rezultatima, pa 'choosing'
  }
  return next;
}

/** Nastavi na sljedeće dijeljenje: podijeli karte, novi diler bira igru. */
export function continueToNextDeal(g, rng = Math.random) {
  if (g.status !== 'dealOver') throw new Error('Dijeljenje nije završeno.');
  const hands = dealHands(rng);
  return {
    ...g,
    status: 'choosing',
    hands: { 0: hands[0], 1: hands[1], 2: hands[2], 3: hands[3] },
    turnDeadline: Date.now() + TURN_MS,
  };
}

/** Redoslijed na kraju: rastuće po bodovima (najmanje = pobjednik). */
export function finalRanking(g) {
  return [0, 1, 2, 3]
    .map((seat) => ({ seat, score: g.scores[seat] || 0 }))
    .sort((a, b) => a.score - b.score);
}

/** Automatski potez kad istekne timer: najniža validna karta / PASS / prvi kontrat. */
export function autoMove(g, seat) {
  if (g.status === 'choosing' && seat === g.dealerSeat) {
    return { type: 'contract', value: availableContracts(g)[0] };
  }
  const moves = legalMoves(g, seat);
  if (!moves.length) return null;
  if (moves[0] === 'PASS') return { type: 'move', value: 'PASS' };
  const sorted = [...moves].sort((a, b) => rankOf(a) - rankOf(b));
  return { type: 'move', value: sorted[0] };
}

export { sortHand };
