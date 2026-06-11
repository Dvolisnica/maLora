// ─── Diler bira igru (karte u ruci ostaju vidljive ispod panela) ────────────
import { motion } from 'framer-motion';
import { CONTRACTS, CONTRACT_ORDER } from '../game/contracts.js';

export default function ContractPicker({ available, onPick, remaining }) {
  return (
    <motion.div
      className="card-panel"
      role="dialog"
      aria-label="Izbor igre"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      style={{
        position: 'fixed', top: 48, left: '50%', transform: 'translateX(-50%)',
        width: 'min(94vw, 400px)', maxHeight: '52dvh', overflowY: 'auto',
        zIndex: 85, background: 'var(--surface-solid)',
      }}
    >
      <div className="row spread">
        <h3 style={{ margin: '2px 0 8px' }}>Pogledaj karte i izaberi igru</h3>
        <span className="muted" aria-label={`${remaining} sekundi`}>{remaining}s</span>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {CONTRACT_ORDER.map((id) => {
          const c = CONTRACTS[id];
          const ok = available.includes(id);
          return (
            <button
              key={id}
              className="btn btn-sm"
              disabled={!ok}
              onClick={() => onPick(id)}
              style={{ justifyContent: 'flex-start', textAlign: 'left', opacity: ok ? 1 : 0.3, padding: '8px 12px' }}
            >
              <span style={{ fontSize: 17, width: 24 }} aria-hidden="true">{c.icon}</span>
              <span>
                <strong style={{ fontSize: 14 }}>{c.name}</strong>
                <br />
                <small className="muted" style={{ fontSize: 11.5 }}>{c.desc}</small>
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
