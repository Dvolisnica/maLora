// ─── In-game chat: brzi odgovori + slobodni tekst (max 200, profanity filter) ─
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sendChat } from '../firebase/rtdb.js';
import { useGameStore } from '../store/useGameStore.js';
import { useAuthStore } from '../store/useAuthStore.js';

const QUICK = ['Bravo! 👏', 'Sretno! 🍀', 'Hmm… 🤔', 'Hahaha 😂', 'Joj… 😅', '🔥', '❤️', '👍'];

export default function Chat({ roomId }) {
  const { chat, chatOpen, unread, toggleChat } = useGameStore();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat, chatOpen]);

  const send = (t) => {
    const msg = (t ?? text).trim();
    if (!msg) return;
    sendChat(roomId, user, msg);
    setText('');
  };

  return (
    <>
      <button className="btn chat-fab" onClick={toggleChat} aria-label={`Chat${unread ? `, ${unread} nepročitanih` : ''}`}>
        💬
        {unread > 0 && <span className="badge-dot">{unread}</span>}
      </button>
      <AnimatePresence>
        {chatOpen && (
          <motion.div className="card-panel chat-panel" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}>
            <div className="chat-msgs" role="log" aria-live="polite">
              {chat.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Pozdravi ekipu! 👋</p>}
              {chat.slice(-60).map((m) => (
                <div key={m.id} className="chat-msg">
                  <strong style={{ color: m.uid === user.uid ? 'var(--accent)' : 'var(--ok)' }}>{m.name.split(' ')[0]}:</strong> {m.text}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 4, margin: '6px 0' }}>
              {QUICK.map((q) => (
                <button key={q} className="btn btn-ghost btn-sm" style={{ fontSize: 12.5, padding: '4px 8px' }} onClick={() => send(q)}>{q}</button>
              ))}
            </div>
            <form className="row" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input type="text" value={text} maxLength={200} placeholder="Poruka…" onChange={(e) => setText(e.target.value)} aria-label="Poruka" />
              <button className="btn btn-primary btn-sm" type="submit" aria-label="Pošalji">➤</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
