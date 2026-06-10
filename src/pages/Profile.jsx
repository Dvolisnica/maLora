// ─── Profil: statistike, graf performansi, achievements ────────────────────
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuthStore } from '../store/useAuthStore.js';
import { getProfile } from '../firebase/firestore.js';
import { ACHIEVEMENTS } from '../game/achievements.js';
import RankBadge from '../components/RankBadge.jsx';

function Stat({ label, value }) {
  return (
    <div className="card-panel" style={{ textAlign: 'center', padding: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
    </div>
  );
}

export default function Profile() {
  const { uid } = useParams();
  const nav = useNavigate();
  const { user, profile: myProfile } = useAuthStore();
  const targetUid = uid || user.uid;
  const isMe = targetUid === user.uid;
  const [profile, setProfile] = useState(isMe ? myProfile : null);

  useEffect(() => {
    if (isMe) setProfile(myProfile);
    else getProfile(targetUid).then(setProfile);
  }, [targetUid, myProfile]);

  if (!profile) return <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}><p className="muted">Učitavanje…</p></div>;

  const winRate = profile.games ? Math.round((profile.wins / profile.games) * 100) : 0;
  const avgPts = profile.games ? (profile.totalPoints / profile.games).toFixed(1) : '—';
  const chartData = (profile.last20 || []).map((g, i) => ({ i: i + 1, elo: g.elo, plasman: g.place, bodovi: g.score }));
  const unlocked = profile.achievements || {};

  return (
    <div className="page" style={{ gap: 14 }}>
      <header className="row spread">
        <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>← Nazad</button>
        <h2 style={{ margin: 0 }}>Profil</h2>
        <span style={{ width: 70 }} />
      </header>

      <div className="card-panel row" style={{ gap: 14 }}>
        <img className="avatar" src={profile.photo} alt="" width={64} height={64} referrerPolicy="no-referrer" />
        <div>
          <h3 style={{ margin: '0 0 4px' }}>{profile.name}</h3>
          <RankBadge elo={profile.elo} />
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>ELO: <strong style={{ color: 'var(--accent)' }}>{profile.elo}</strong></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Stat label="Partije" value={profile.games || 0} />
        <Stat label="Pobjede" value={profile.wins || 0} />
        <Stat label="Porazi" value={profile.losses || 0} />
        <Stat label="Win rate" value={`${winRate}%`} />
        <Stat label="Ø bodova" value={avgPts} />
        <Stat label="Najduži niz" value={`${profile.bestStreak || 0} 🔥`} />
      </div>

      {chartData.length > 1 && (
        <div className="card-panel">
          <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>ELO — zadnjih {chartData.length} partija</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke="var(--muted)" fontSize={11} />
              <YAxis domain={['dataMin - 20', 'dataMax + 20']} stroke="var(--muted)" fontSize={11} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}
                formatter={(v, name) => [v, name === 'elo' ? 'ELO' : name]}
              />
              <Line type="monotone" dataKey="elo" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card-panel">
        <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Achievements</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {Object.entries(ACHIEVEMENTS).map(([id, a]) => {
            const has = !!unlocked[id];
            return (
              <div key={id} className="row" style={{ opacity: has ? 1 : 0.35, gap: 8, padding: 6 }} aria-label={`${a.name}${has ? ', otključano' : ', zaključano'}`}>
                <span style={{ fontSize: 24 }} aria-hidden="true">{has ? a.icon : '🔒'}</span>
                <span>
                  <strong style={{ fontSize: 13 }}>{a.name}</strong>
                  <br />
                  <small className="muted" style={{ fontSize: 11 }}>{a.desc}</small>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
