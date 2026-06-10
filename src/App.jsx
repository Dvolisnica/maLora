import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { watchAuth } from './firebase/auth.js';
import { watchProfile } from './firebase/firestore.js';
import { useAuthStore } from './store/useAuthStore.js';
import { useUIStore } from './store/useUIStore.js';
import Toasts from './components/Toasts.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';
import Profile from './pages/Profile.jsx';
import Leaderboard from './pages/Leaderboard.jsx';

export default function App() {
  const { user, loading, setUser, setProfile } = useAuthStore();
  const theme = useUIStore((s) => s.theme);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => watchAuth(setUser), []);
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    return watchProfile(user.uid, setProfile);
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span aria-busy="true" style={{ fontSize: 42 }}>🂠</span>
        <p className="muted">Učitavanje…</p>
      </div>
    );
  }

  return (
    <>
      <Toasts />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="/lobby/:roomId" element={user ? <Lobby /> : <Navigate to="/login" replace />} />
        <Route path="/game/:roomId" element={user ? <Game /> : <Navigate to="/login" replace />} />
        <Route path="/profile/:uid?" element={user ? <Profile /> : <Navigate to="/login" replace />} />
        <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
