// ─── Tabela rezultata (live) ────────────────────────────────────────────────
import { CONTRACTS } from '../game/contracts.js';

export default function ScoreBoard({ game, onClose }) {
  const players = game.players || [];
  return (
    <div className="overlay" role="dialog" aria-label="Rezultati" onClick={onClose}>
      <div className="card-panel" style={{ width: 'min(94vw, 460px)', maxHeight: '80dvh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h2 style={{ margin: '2px 0 10px' }}>Rezultati</h2>
          <span className="muted">dijeljenje {Math.min(game.dealIndex + 1, 28)}/28</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 6 }}>Kontrat</th>
              {players.map((p, i) => (
                <th key={i} style={{ padding: 6, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ')[0]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(game.history || []).map((h, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 6 }}>{CONTRACTS[h.contract]?.name} <small className="muted">({players[h.dealer]?.name.split(' ')[0]})</small></td>
                {h.pts.map((p, j) => <td key={j} style={{ textAlign: 'center', padding: 6 }}>{p}</td>)}
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--accent)', fontWeight: 700 }}>
              <td style={{ padding: 6 }}>Ukupno</td>
              {players.map((_, i) => <td key={i} style={{ textAlign: 'center', padding: 6, color: 'var(--accent)' }}>{game.scores[i] || 0}</td>)}
            </tr>
          </tbody>
        </table>
        <button className="btn btn-sm" onClick={onClose} style={{ marginTop: 12, width: '100%' }}>Zatvori</button>
      </div>
    </div>
  );
}
