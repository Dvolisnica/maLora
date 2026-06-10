// ─── Lobby: čekanje igrača, kod sobe, countdown ─────────────────────────────
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore.js';
import { useGameStore } from '../store/useGameStore.js';
import { useUIStore } from '../store/useUIStore.js';
import { useRoomSync } from '../hooks/useRoomSync.js';
import { startGame, leaveRoom } from '../firebase/rtdb.js';

const COUNTDOWN = 5;

export default function Lobby() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();
  const { room, reset } = useGameStore();
  const addToast = useUIStore((s) => s.addToast);
  const [count, setCount] = useState(null);

  useRoomSync(roomId);

  const players = room?.players || {};
  const filled = [0, 1, 2, 3].filter((i) => players[i]);
  const isHost = room?.meta?.hostUid === user.uid;
  const full = filled.length === 4;

  // Igra počela → na sto
  useEffect(() => {
    if (room?.meta?.status === 'playing') nav(`/game/${roomId}`);
    if (room === null) { reset(); nav('/'); } // soba obrisana
  }, [room?.meta?.status, room]);

  // Countdown kad su svi tu; host pokreće igru
  useEffect(() => {
    if (!full) { setCount(null); return; }
    setCount(COUNTDOWN);
    const t = setInterval(() => setCount((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [full]);

  useEffect(() => {
    if (count === 0 && isHost && full) startGame(roomId, room).catch((e) => addToast({ title: 'Greška', body: e.message }));
  }, [count]);

  const leave = async () => {
    await leaveRoom(roomId, user);
    reset();
    nav('/');
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(room.meta.code);
    addToast({ title: '📋 Kod kopiran', body: 'Pošalji ga prijateljima!' });
  };

  return (
    <div className="page" style={{ gap: 16 }}>
      <header className="row spread">
        <button className="btn btn-ghost btn-sm" onClick={leave}>← Napusti</button>
        <h2 style={{ margin: 0 }}>Lobby</h2>
        <span style={{ width: 70 }} />
      </header>

      {room?.meta?.code && (
        <button className="card-panel" onClick={copyCode} style={{ textAlign: 'center', cursor: 'pointer', border: '1px dashed var(--accent)' }} aria-label={`Kod sobe ${room.meta.code}, tapni za kopiranje`}>
          <span className="muted" style={{ fontSize: 13 }}>KOD SOBE — tapni za kopiranje</span>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 10, color: 'var(--accent)' }}>{room.meta.code}</div>
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => {
          const p = players[i];
          return (
            <motion.div key={i} className="card-panel row" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }} style={{ minHeight: 72 }}>
              {p ? (
                <>
                  <img className="avatar" src={p.photo} alt="" width={42} height={42} referrerPolicy="no-referrer" />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {p.name}
                    {p.uid === room?.meta?.hostUid && <span title="Host"> 👑</span>}
                  </span>
                </>
              ) : (
                <span className="muted" style={{ fontSize: 14 }}>⏳ Čeka se igrač…</span>
              )}
            </motion.div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 'auto' }} aria-live="polite">
        {full ? (
          <motion.div key={count} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <p className="muted">Svi su tu! Partija počinje za</p>
            <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--accent)' }}>{count}</div>
          </motion.div>
        ) : (
          <p className="muted">{filled.length}/4 igrača u sobi</p>
        )}
      </div>
    </div>
  );
}
