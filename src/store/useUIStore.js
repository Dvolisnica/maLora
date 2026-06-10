// ─── UI: tema, toast notifikacije ───────────────────────────────────────────
import { create } from 'zustand';

const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('lora-theme') : null;

export const useUIStore = create((set) => ({
  theme: savedTheme || 'dark', // noćni mod po defaultu
  toasts: [],

  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('lora-theme', theme);
      document.documentElement.dataset.theme = theme;
      return { theme };
    }),

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  },
}));
