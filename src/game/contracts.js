// ─── 7 kontrata tradicionalne Lore ──────────────────────────────────────────
// Lora je igra IZBJEGAVANJA bodova: pobjeđuje igrač s NAJMANJE bodova
// nakon 28 dijeljenja. Špil 32 karte (7–A), 8 karata po igraču.
// Dijeli se PRIJE biranja: diler pogleda svoje karte pa bira jednu od
// svojih još neodigranih igara — biranje ide u krug, svako svih 7.

import { suitOf, rankOf } from './deck.js';

export const CONTRACT_ORDER = [
  'STIHOVI', 'HERCEVI', 'DAME', 'KRALJ', 'ZADNJA2', 'MAKSIMUM', 'LORA',
];

export const CONTRACTS = {
  STIHOVI:  { name: 'Štihovi',     icon: '🂠', desc: 'Svaki uzeti štih +1 bod (ukupno 8).' },
  HERCEVI:  { name: 'Herčevi',     icon: '♥',  desc: 'Svaki uzeti herc +1 bod (ukupno 8).' },
  DAME:     { name: 'Dame',        icon: '♛',  desc: 'Svaka uzeta dama +2 boda (4 dame, ukupno 8).' },
  KRALJ:    { name: 'Kralj herc',  icon: '♚',  desc: 'Ko uzme kralja herc dobiva +8 bodova.' },
  ZADNJA2:  { name: 'Zadnja dva',  icon: '⏱',  desc: 'Pretposljednji i posljednji štih po +4 boda.' },
  MAKSIMUM: { name: 'Maksimum',    icon: 'Σ',  desc: 'Sve zajedno: štih +1, herc +1, dama +2, K♥ +8, zadnja dva +4.' },
  LORA:     { name: 'Lora',        icon: '🃏', desc: 'Slaganje karata u nizove. Prvi bez karata 0, ostali +1 po preostaloj karti.' },
};

const heartsIn  = (cards) => cards.filter((c) => suitOf(c) === 'H').length;
const queensIn  = (cards) => cards.filter((c) => rankOf(c) === 12).length;
const hasKH     = (cards) => cards.includes('H13');

/**
 * Bodovi dijeljenja za štih-kontrate.
 * @param {string} contract
 * @param {{taken: string[][], tricks: number[], lastTwo: number[]}} d
 * @returns {number[]} bodovi po sjedištu
 */
export function scoreTrickDeal(contract, d) {
  const pts = [0, 0, 0, 0];
  for (let seat = 0; seat < 4; seat++) {
    const cards = d.taken[seat] || [];
    const comp = {
      tricks: d.tricks[seat] || 0,
      hearts: heartsIn(cards),
      queens: queensIn(cards),
      kh: hasKH(cards) ? 1 : 0,
      last2: (d.lastTwo || []).filter((s) => s === seat).length,
    };
    switch (contract) {
      case 'STIHOVI':  pts[seat] = comp.tricks; break;
      case 'HERCEVI':  pts[seat] = comp.hearts; break;
      case 'DAME':     pts[seat] = comp.queens * 2; break;
      case 'KRALJ':    pts[seat] = comp.kh * 8; break;
      case 'ZADNJA2':  pts[seat] = comp.last2 * 4; break;
      case 'MAKSIMUM':
        pts[seat] = comp.tricks + comp.hearts + comp.queens * 2 + comp.kh * 8 + comp.last2 * 4;
        break;
      default: throw new Error('Nepoznat kontrat: ' + contract);
    }
  }
  return pts;
}

/** Bodovi za Lora kontrat: prvi koji se riješio karata 0, ostali +1 po karti. */
export function scoreLoraDeal(handCounts) {
  return handCounts.map((n) => n);
}
