// ─── Protivnik za stolom: avatar, ime, broj karata, bodovi, indikator reda ──
import { CardBack } from './Card.jsx';

export default function PlayerSeat({ player, cards, score, isTurn, isDealer, remaining, compact }) {
  if (!player) return null;
  return (
    <div className="row" style={{ flexDirection: 'column', gap: 4, minWidth: 76 }} aria-label={`${player.name}, ${cards} karata, ${score} bodova${isTurn ? ', na potezu' : ''}`}>
      <div className={isTurn ? 'turn-active' : ''} style={{ position: 'relative' }}>
        <img className="avatar" src={player.photo} alt="" width={compact ? 40 : 48} height={compact ? 40 : 48} referrerPolicy="no-referrer" />
        {isDealer && (
          <span title="Diler" style={{ position: 'absolute', bottom: -4, right: -6, background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'grid', placeItems: 'center', fontWeight: 700 }}>D</span>
        )}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, maxWidth: 86, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
      <div className="row" style={{ gap: 6 }}>
        <span className="row" style={{ gap: 2 }} aria-hidden="true">
          <CardBack width={14} /> <span style={{ fontSize: 12 }}>{cards}</span>
        </span>
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{score}</span>
      </div>
      {isTurn && (
        <div className={`timer-bar ${remaining <= 10 ? 'timer-low' : ''}`} style={{ width: 56 }} aria-label={`${remaining} sekundi`}>
          <div style={{ width: `${(remaining / 30) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
