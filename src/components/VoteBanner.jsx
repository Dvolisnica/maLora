// ─── Glasanje za restart / napuštanje partije ───────────────────────────────
import { castVote, clearVotes } from '../firebase/rtdb.js';
import { useAuthStore } from '../store/useAuthStore.js';

const LABELS = { restart: 'restart partije', leave: 'prekid partije' };

export default function VoteBanner({ roomId, votes, type, total = 4 }) {
  const user = useAuthStore((s) => s.user);
  const v = votes?.[type] || {};
  const yes = Object.values(v).filter(Boolean).length;
  const voted = v[user.uid] !== undefined;
  if (!yes) return null;

  return (
    <div className="card-panel row spread" style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 110, width: 'min(94vw, 400px)' }} role="alert">
      <span style={{ fontSize: 14 }}>
        Glasanje za <strong>{LABELS[type]}</strong>: {yes}/{total}
      </span>
      {!voted ? (
        <span className="row" style={{ gap: 6 }}>
          <button className="btn btn-primary btn-sm" onClick={() => castVote(roomId, type, user.uid, true)}>Da</button>
          <button className="btn btn-ghost btn-sm" onClick={() => castVote(roomId, type, user.uid, false)}>Ne</button>
        </span>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => clearVotes(roomId, type)}>Poništi</button>
      )}
    </div>
  );
}
