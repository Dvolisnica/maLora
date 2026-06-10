// ─── SVG igraća karta u klasičnom stilu ─────────────────────────────────────
import { memo } from 'react';
import { suitOf, rankOf, rankLabel, SUIT_INFO } from '../game/deck.js';

/** Raspored simbola u sredini za rankove 2–10 (x: 0–2, y: 0–5). */
const PIPS = {
  2: [[1, 0], [1, 5]], 3: [[1, 0], [1, 2.5], [1, 5]],
  4: [[0, 0], [2, 0], [0, 5], [2, 5]],
  5: [[0, 0], [2, 0], [1, 2.5], [0, 5], [2, 5]],
  6: [[0, 0], [2, 0], [0, 2.5], [2, 2.5], [0, 5], [2, 5]],
  7: [[0, 0], [2, 0], [1, 1.25], [0, 2.5], [2, 2.5], [0, 5], [2, 5]],
  8: [[0, 0], [2, 0], [1, 1.25], [0, 2.5], [2, 2.5], [1, 3.75], [0, 5], [2, 5]],
  9: [[0, 0], [2, 0], [0, 1.7], [2, 1.7], [1, 2.5], [0, 3.3], [2, 3.3], [0, 5], [2, 5]],
  10: [[0, 0], [2, 0], [1, 0.8], [0, 1.7], [2, 1.7], [0, 3.3], [2, 3.3], [1, 4.2], [0, 5], [2, 5]],
};

function CardSvg({ id, width }) {
  const s = suitOf(id), r = rankOf(id);
  const { symbol, color } = SUIT_INFO[s];
  const fill = color === 'red' ? 'var(--card-red)' : 'var(--card-black)';
  const label = rankLabel(r);
  const h = width * 1.4;

  return (
    <svg width={width} height={h} viewBox="0 0 100 140" aria-hidden="true">
      <rect x="1" y="1" width="98" height="138" rx="9" fill="var(--card-face)" stroke="#00000022" />
      {/* uglovi */}
      <text x="9" y="22" fontSize="19" fontWeight="700" fill={fill} fontFamily="Georgia, serif">{label}</text>
      <text x="9" y="38" fontSize="15" fill={fill}>{symbol}</text>
      <g transform="rotate(180 50 70)">
        <text x="9" y="22" fontSize="19" fontWeight="700" fill={fill} fontFamily="Georgia, serif">{label}</text>
        <text x="9" y="38" fontSize="15" fill={fill}>{symbol}</text>
      </g>
      {/* sredina */}
      {r <= 10 ? (
        PIPS[r].map(([px, py], i) => (
          <text key={i} x={32 + px * 18} y={42 + py * 14.5} fontSize="17" fill={fill} textAnchor="middle">{symbol}</text>
        ))
      ) : (
        <>
          <rect x="28" y="35" width="44" height="70" rx="5" fill="none" stroke={fill} strokeWidth="1.6" />
          <text x="50" y="86" fontSize="42" fill={fill} textAnchor="middle" fontFamily="Georgia, serif">
            {r === 14 ? symbol : label}
          </text>
        </>
      )}
    </svg>
  );
}

/** Poleđina karte. */
export function CardBack({ width = 52 }) {
  const h = width * 1.4;
  return (
    <svg width={width} height={h} viewBox="0 0 100 140" aria-hidden="true" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))' }}>
      <rect x="1" y="1" width="98" height="138" rx="9" fill="#11392d" stroke="#00000033" />
      <rect x="8" y="8" width="84" height="124" rx="6" fill="none" stroke="#e9c46a55" strokeWidth="1.5" />
      <text x="50" y="82" fontSize="34" textAnchor="middle" fill="#e9c46a88">♠</text>
    </svg>
  );
}

/** Interaktivna karta: tap za odabir, tap ponovo za igranje (vidi HandFan). */
function Card({ id, width = 64, selected, disabled, onClick, style }) {
  const s = suitOf(id), r = rankOf(id);
  const name = `${rankLabel(r)} ${SUIT_INFO[s].name.toLowerCase()}`;
  return (
    <button
      type="button"
      className={`playing-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      style={style}
      onClick={disabled ? undefined : onClick}
      aria-label={selected ? `Odigraj ${name}` : `Odaberi ${name}`}
      aria-pressed={!!selected}
      disabled={!!disabled && !onClick}
    >
      <CardSvg id={id} width={width} />
    </button>
  );
}

export default memo(Card);
