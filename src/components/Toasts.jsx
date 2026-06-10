// ─── Toast notifikacije (achievements i dr.) ────────────────────────────────
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '../store/useUIStore.js';

export default function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className="toast" initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }}>
            <strong>{t.title}</strong>
            {t.body && <div className="muted" style={{ fontSize: 13 }}>{t.body}</div>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
