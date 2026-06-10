// ─── Timer poteza (30 s) ────────────────────────────────────────────────────
// Prikazuje preostalo vrijeme; po isteku igrač sam (ili host kao fallback
// nakon 3 s grace perioda) upisuje automatski potez kroz RTDB transakciju.
import { useEffect, useState } from 'react';
import { submitTimeout } from '../firebase/rtdb.js';

export function useTurnTimer(roomId, game, mySeat, isHost) {
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    if (!game || (game.status !== 'playing' && game.status !== 'choosing')) return;
    const actorSeat = game.status === 'choosing' ? game.dealerSeat : game.turnSeat;

    const tick = () => {
      const ms = (game.turnDeadline || 0) - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0 && actorSeat === mySeat) submitTimeout(roomId, actorSeat);
      else if (ms <= -3000 && isHost) submitTimeout(roomId, actorSeat); // fallback ako je igrač offline
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [roomId, game?.turnDeadline, game?.status, mySeat, isHost]);

  return remaining;
}
