// ─── Sinhronizacija sobe, chata i kraja partije ─────────────────────────────
import { useEffect, useRef } from 'react';
import { watchRoom, watchChat } from '../firebase/rtdb.js';
import { updateMyStatsAfterGame, archiveMatch } from '../firebase/firestore.js';
import { finalRanking } from '../game/engine.js';
import { ACHIEVEMENTS } from '../game/achievements.js';
import { useGameStore } from '../store/useGameStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUIStore } from '../store/useUIStore.js';

export function useRoomSync(roomId) {
  const setRoom = useGameStore((s) => s.setRoom);
  const setChat = useGameStore((s) => s.setChat);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const statsWritten = useRef(null); // čuvaj da se statistika ne upiše dvaput

  useEffect(() => {
    if (!roomId) return;
    const u1 = watchRoom(roomId, (room) => {
      setRoom(room);
      const game = room?.game;
      // Kraj partije → upiši statistike (jednom po finishedAt)
      // Partije s botovima se ne računaju u statistike i ELO
      if (game?.status === 'gameOver' && !game.hasBots && user && statsWritten.current !== game.finishedAt) {
        statsWritten.current = game.finishedAt;
        const ranking = finalRanking(game);
        updateMyStatsAfterGame(user.uid, game, ranking).then((newAch) => {
          for (const id of newAch) {
            const a = ACHIEVEMENTS[id];
            addToast({ type: 'achievement', title: `${a.icon} ${a.name}`, body: a.desc });
          }
        });
        if (room.meta?.hostUid === user.uid) archiveMatch(game, ranking).catch(() => {});
      }
    });
    const u2 = watchChat(roomId, setChat);
    return () => { u1(); u2(); };
  }, [roomId, user?.uid]);
}
