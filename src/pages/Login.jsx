// ─── Login: Google OAuth ────────────────────────────────────────────────────
import { useState } from 'react';
import { motion } from 'framer-motion';
import { loginWithGoogle } from '../firebase/auth.js';

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    setBusy(true); setError('');
    try { await loginWithGoogle(); }
    catch (e) { setError('Prijava nije uspjela. Pokušaj ponovo.'); console.error(e); }
    finally { setBusy(false); }
  };

  return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center', gap: 18, textAlign: 'center' }}>
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div style={{ fontSize: 72, lineHeight: 1 }} aria-hidden="true">🂱</div>
        <h1 style={{ fontSize: 44, margin: '10px 0 2px' }}>Lora</h1>
        <p className="muted" style={{ margin: 0 }}>Klasična kartaška igra za 4 igrača</p>
      </motion.div>
      <motion.button
        className="btn btn-primary"
        onClick={login}
        disabled={busy}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ fontSize: 17, padding: '16px 28px' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 4.3-5.35 4.3a5.8 5.8 0 1 1 0-11.6c1.45 0 2.75.55 3.75 1.45l2.15-2.15A8.8 8.8 0 1 0 12 20.8c4.4 0 8.4-3.2 8.4-8.8 0-.3-.02-.6-.05-.9z"/></svg>
        {busy ? 'Prijava…' : 'Prijavi se Google nalogom'}
      </motion.button>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      <p className="muted" style={{ fontSize: 12.5, maxWidth: 300 }}>
        Prijavom se kreira tvoj profil s avatarom i statistikama. Ostaješ prijavljen i nakon zatvaranja aplikacije.
      </p>
    </div>
  );
}
