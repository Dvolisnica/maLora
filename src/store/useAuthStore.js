// ─── Auth + profil (Zustand) ────────────────────────────────────────────────
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,      // Firebase Auth user
  profile: null,   // Firestore dokument (elo, statistike…)
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setProfile: (profile) => set({ profile }),
}));
