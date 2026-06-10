// ─── Sredina stola: odigrane karte tekućeg štiha ────────────────────────────
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card.jsx';

// Pozicije karata oko centra prema relativnom sjedištu (ja=dolje)
const POS = [
  { x: 0, y: 34, rotate: 0 },    // ja (dolje)
  { x: -46, y: 0, rotate: -8 },  // lijevo
  { x: 0, y: -34, rotate: 4 },   // preko puta
  { x: 46, y: 0, rotate: 8 },    // desno
];

export default function TrickArea({ trick, mySeat, collectTo }) {
  const cards = trick?.cards || {};
  return (
    <div style={{ position: 'relative', width: 190, height: 170, margin: '0 auto' }} aria-label="Karte na stolu">
      <AnimatePresence>
        {Object.entries(cards).map(([seat, card]) => {
          const rel = (Number(seat) - mySeat + 4) % 4;
          const p = POS[rel];
          const exitRel = collectTo != null ? (collectTo - mySeat + 4) % 4 : rel;
          return (
            <motion.div
              key={card}
              initial={{ x: POS[rel].x * 3, y: POS[rel].y * 3, opacity: 0, scale: 0.6 }}
              animate={{ x: p.x, y: p.y, rotate: p.rotate, opacity: 1, scale: 1 }}
              exit={{ x: POS[exitRel].x * 4, y: POS[exitRel].y * 4, opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -27, marginTop: -38 }}
            >
              <Card id={card} width={54} disabled />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
