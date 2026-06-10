// ─── Konfete za ekran pobjede ───────────────────────────────────────────────
import { useMemo } from 'react';

const COLORS = ['#e9c46a', '#57cc99', '#e76f51', '#4895ef', '#f4a261', '#b5179e'];

export default function Confetti({ count = 90 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.2,
        dur: 2.6 + Math.random() * 2,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
      })),
    [count]
  );
  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}vw`,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
            borderRadius: p.id % 3 === 0 ? '50%' : 2,
          }}
        />
      ))}
    </>
  );
}
