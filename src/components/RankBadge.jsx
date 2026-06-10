// ─── Rang bedž (Početnik → Legenda) ─────────────────────────────────────────
import { rankFor } from '../game/elo.js';

export default function RankBadge({ elo, size = 'md' }) {
  const r = rankFor(elo ?? 1000);
  const pad = size === 'sm' ? '2px 8px' : '4px 12px';
  return (
    <span
      style={{
        background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}66`,
        borderRadius: 999, padding: pad, fontSize: size === 'sm' ? 12 : 13.5, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}
      aria-label={`Rang: ${r.name}`}
    >
      <span aria-hidden="true">{r.icon}</span> {r.name}
    </span>
  );
}
