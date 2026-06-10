// ─── Tabla za kontrat "Lora": 4 niza po boji ────────────────────────────────
import { SUITS, SUIT_INFO, rankLabel, nextRank } from '../game/deck.js';

export default function LoraBoard({ lora }) {
  if (!lora) return null;
  const { startRank, played = {}, next = {} } = lora;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px' }} aria-label="Lora nizovi">
      {!startRank && <p className="muted" style={{ textAlign: 'center', margin: 8 }}>Prva karta otvara sve nizove…</p>}
      {startRank > 0 && SUITS.map((s) => {
        const info = SUIT_INFO[s];
        const ranks = played[s] || [];
        return (
          <div key={s} className="row" style={{ gap: 4, overflowX: 'auto' }}>
            <span style={{ fontSize: 18, color: info.color === 'red' ? 'var(--card-red)' : 'var(--text)', width: 22 }}>{info.symbol}</span>
            {ranks.map((r) => (
              <span key={r} style={{ background: 'var(--card-face)', color: info.color === 'red' ? 'var(--card-red)' : 'var(--card-black)', borderRadius: 5, padding: '2px 6px', fontSize: 13, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
                {rankLabel(r)}
              </span>
            ))}
            {next[s] && next[s] !== 'DONE' && (
              <span style={{ border: '1.5px dashed var(--muted)', color: 'var(--muted)', borderRadius: 5, padding: '2px 6px', fontSize: 13 }}>
                {rankLabel(next[s])}?
              </span>
            )}
            {next[s] === 'DONE' && <span style={{ color: 'var(--ok)', fontSize: 13 }}>✓</span>}
          </div>
        );
      })}
    </div>
  );
}
