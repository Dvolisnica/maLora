// ─── Bot igrač ──────────────────────────────────────────────────────────────
// Kad je na potezu bot, host klijent nakon kratke pauze odigra automatski
// potez (ista logika kao timeout: najniža validna karta / prvi kontrat).
import { useEffect } from 'react';
import { autoMove } from '../game/engine.js';
import { submitMove, submitContract } from '../firebase/rtdb.js';

export function useBotPlayer(roomId, game, isHost) {
  useEffect(() => {
    if (!isHost || !game) return;
    const actor =
      game.status === 'choosing' ? game.dealerSeat
      : game.status === 'playing' ? game.turnSeat
      : null;
    if (actor == null) return;
    if (!game.players?.[actor]?.isBot) return;

    const t = setTimeout(() => {
      const am = autoMove(game, actor);
      if (!am) return;
      if (am.type === 'contract') submitContract(roomId, actor, am.value);
      else submitMove(roomId, actor, am.value);
    }, 1100 + Math.random() * 700); // malo "ljudskog" kašnjenja
    return () => clearTimeout(t);
  }, [roomId, isHost, game?.status, game?.turnSeat, game?.dealerSeat, game?.lastMove?.at, game?.dealIndex]);
}
