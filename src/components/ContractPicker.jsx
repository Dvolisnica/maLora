// ─── Diler bira kontrat ─────────────────────────────────────────────────────
import { motion } from 'framer-motion';
import { CONTRACTS, CONTRACT_ORDER } from '../game/contracts.js';

export default function ContractPicker({ available, onPick, remaining }) {
  return (
    <div className="overlay" role="dialog" aria-label="Izbor kontrata">
      <motion.div className="card-panel" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: 'min(94vw, 420px)' }}>
        <div className="row spread">
          <h2 style={{ margin: '4px 0 12px' }}>Ti si diler — izaberi kontrat</h2>
          <span className="muted" aria-label={`${remaining} sekundi`}>{remaining}s</span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {CONTRACT_ORDER.map((id) => {
            const c = CONTRACTS[id];
            const ok = available.includes(id);
            return (
              <button key={id} className="btn" disabled={!ok} onClick={() => onPick(id)} style={{ justifyContent: 'flex-start', textAlign: 'left', opacity: ok ? 1 : 0.35 }}>
                <span style={{ fontSize: 20, width: 28 }}>{c.icon}</span>
                <span>
                  <strong>{c.name}</strong>
                  <br />
                  <small className="muted">{c.desc}</small>
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
