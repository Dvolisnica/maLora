// ─── Leaderboard: globalni (ELO) i sedmični (pobjede) top 50 ────────────────
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getGlobalLeaderboard, getWeeklyLeaderboard } from '../firebase/firestore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import RankBadge from '../components/RankBadge.jsx';

export default function Leaderboard() {
  const nav = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('global');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null); setError('');
    (tab === 'global' ? getGlobalLeaderboard() : getWeeklyLeaderboard())
      .then(setRows)
      .catch((e) => { console.error(e); setError('Greška pri učitavanju. (Sedmična lista zahtijeva Firestore indeks — vidi README.)'); });
  }, [tab]);

  return (
    <div className="page" style={{ gap: 12 }}>
      <header className="row spread">
        <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>← Nazad</button>
        <h2 style={{ margin: 0 }}>🏆 Leaderboard</h2>
        <span style={{ width: 70 }} />
      </header>

      <div className="row" role="tablist" style={{ gap: 8 }}>
        <button role="tab" aria-selected={tab === 'global'} className={`btn btn-sm ${tab === 'global' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setTab('global')}>Globalni</button>
        <button role="tab" aria-selected={tab === 'weekly'} className={`btn btn-sm ${tab === 'weekly' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setTab('weekly')}>Ove sedmice</button>
      </div>

      {error && <p className="muted" role="alert" style={{ fontSize: 13 }}>{error}</p>}
      {!rows && !error && <p className="muted" style={{ textAlign: 'center' }}>Učitavanje…</p>}

      <div style={{ display: 'grid', gap: 6 }}>
        {rows?.map((p, i) => (
          <motion.div
            key={p.uid}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.5) }}
          >
            <Link to={`/profile/${p.uid}`} className="card-panel row spread" style={{ textDecoration: 'none', color: 'inherit', padding: '10px 12px', border: p.uid === user.uid ? '1px solid var(--accent)' : undefined }}>
              <span className="row" style={{ gap: 10 }}>
                <strong style={{ width: 26, textAlign: 'center', color: i < 3 ? 'var(--accent)' : 'var(--muted)' }}>
                  {['🥇', '🥈', '🥉'][i] || i + 1}
                </strong>
                <img className="avatar" src={p.photo} alt="" width={34} height={34} referrerPolicy="no-referrer" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
              </span>
              <span className="row" style={{ gap: 8 }}>
                <RankBadge elo={p.elo} size="sm" />
                <strong style={{ color: 'var(--accent)', minWidth: 44, textAlign: 'right' }}>
                  {tab === 'global' ? p.elo : `${p.weeklyWins || 0} 🏅`}
                </strong>
              </span>
            </Link>
          </motion.div>
        ))}
        {rows?.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>Još nema rezultata ove sedmice.</p>}
      </div>
    </div>
  );
}
