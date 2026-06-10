// ─── Ruka kao "arc fan" s horizontalnim scrollom ────────────────────────────
// Tap 1: karta se podigne (odabrana). Tap 2 (ili tap na stol): odigra se.
import { motion } from 'framer-motion';
import Card from './Card.jsx';
import { useGameStore } from '../store/useGameStore.js';
import { useHaptics } from '../hooks/useHaptics.js';

export default function HandFan({ hand, legal, myTurn, onPlay }) {
  const { selectedCard, selectCard } = useGameStore();
  const haptics = useHaptics();
  const n = hand.length;
  const cardW = n > 10 ? 58 : 66;

  const handleTap = (card, isLegal) => {
    if (!myTurn || !isLegal) return;
    if (selectedCard === card) {
      haptics.play();
      selectCard(null);
      onPlay(card);
    } else {
      haptics.tap();
      selectCard(card);
    }
  };

  return (
    <div className="hand-fan" role="group" aria-label={`Tvoja ruka, ${n} karata`}>
      {hand.map((card, i) => {
        const mid = (n - 1) / 2;
        const angle = n > 1 ? ((i - mid) / mid) * 14 : 0; // ±14° lepeza
        const lift = Math.abs(i - mid) * (n > 8 ? 3.2 : 5); // luk
        const isLegal = legal.includes(card);
        return (
          <motion.div
            key={card}
            initial={{ y: 80, opacity: 0, rotate: 0 }}
            animate={{ y: lift, opacity: 1, rotate: angle }}
            transition={{ delay: i * 0.035, type: 'spring', stiffness: 280, damping: 22 }}
            style={{ marginLeft: i === 0 ? 0 : -(cardW * 0.45), zIndex: i, transformOrigin: 'bottom center' }}
          >
            <Card
              id={card}
              width={cardW}
              selected={selectedCard === card}
              disabled={myTurn && !isLegal}
              onClick={() => handleTap(card, isLegal)}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
