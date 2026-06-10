// ─── Početni ekran: privatna soba, kod, javni matchmaking ──────────────────
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUIStore } from '../store/useUIStore.js';
import { logout } from '../firebase/auth.js';
import { createPrivateRoom, joinByCode, joinQueue, leaveQueue, watchQueue } from '../firebase/rtdb.js';
import RankBadge from '../components/RankBadge.jsx';

export default function Home() {
  const { user, profile } = useAuthStore();
  const { theme, toggleTheme, addToast } = useUIStore();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => () => { unsubRef.current?.(); if (inQueue) leaveQueue(user); }, []);

  const createRoom = async () => {
    setBusy(true);
    try {
      const { roomId } = await createPrivateRoom(user, profile);
      nav(`/lobby/${roomId}`);
    } catch (e) { addToast({ title: 'Greška', body: e.message }); setBusy(false); }
  };

  const join = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) return;
    setBusy(true);
    try {
      const roomId = await joinByCode(code, user, profile);
      nav(`/lobby/${roomId}`);
    } catch (e2) { addToast({ title: 'Greška', body: e2.message }); setBusy(false); }
  };

  const queue = async () => {
    if (inQueue) {
      unsubRef.current?.();
      await leaveQueue(user);
      setInQueue(false);
      return;
    }
    setInQueue(true);
    await joinQueue(user, profile);
    unsubRef.current = watchQueue(user, profile, (roomId) => {
      unsubRef.current?.();
      nav(`/lobby/${roomId}`);
    });
  };

  return (
    <div className="page" style={{ gap: 16 }}>
      <header className="row spread">
        <Link to={`/profile/${user.uid}`} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img className="avatar" src={user.photoURL} alt="" width={44} height={44} referrerPolicy="no-referrer" />
          <span>
            <strong>{profile?.name || user.displayName}</strong>
            <br />
            <RankBadge elo={profile?.elo} size="sm" />
          </span>
        </Link>
        <span className="row" style={{ gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme} aria-label="Promijeni temu">{theme === 'dark' ? '☀️' : '🌙'}</button>
          <button className="btn btn-ghost btn-sm" onClick={logout} aria-label="Odjava">⎋</button>
        </span>
      </header>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', margin: '18px 0 6px' }}>
        <div style={{ fontSize: 56 }} aria-hidden="true">🂱</div>
        <h1 style={{ margin: '4px 0' }}>Lora</h1>
        <p className="muted" style={{ margin: 0 }}>ELO: <strong style={{ color: 'var(--accent)' }}>{profile?.elo ?? 1000}</strong> · {profile?.wins ?? 0} pobjeda</p>
      </motion.div>

      <div style={{ display: 'grid', gap: 10 }}>
        <button className="btn btn-primary" onClick={createRoom} disabled={busy || inQueue}>
          🔒 Kreiraj privatnu sobu
        </button>
        <form className="row" onSubmit={join}>
          <input
            type="text" value={code} maxLength={6} placeholder="KOD SOBE (6 znakova)"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            aria-label="Kod sobe" style={{ textTransform: 'uppercase', letterSpacing: 3, textAlign: 'center' }}
          />
          <button className="btn" type="submit" disabled={busy || code.length !== 6 || inQueue}>Uđi</button>
        </form>
        <button className="btn" onClick={queue} disabled={busy}>
          {inQueue ? <span aria-live="polite">⏳ Tražim igrače… (tap za odustajanje)</span> : '🌍 Javna igra — brzo spajanje'}
        </button>
        <Link to="/leaderboard" className="btn btn-ghost" style={{ textDecoration: 'none' }}>🏆 Leaderboard</Link>
      </div>

      <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 'auto' }}>
        4 igrača · 28 dijeljenja · najmanje bodova pobjeđuje
      </p>
    </div>
  );
}
