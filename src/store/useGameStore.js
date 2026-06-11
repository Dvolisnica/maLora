// ─── Stanje sobe i partije (Zustand) ────────────────────────────────────────
import { create } from 'zustand';
import { normalize } from '../game/engine.js';

export const useGameStore = create((set, get) => ({
  roomId: null,
  room: undefined,
  game: null,        // normalizovano stanje engine-a
  chat: [],
  chatOpen: false,
  unread: 0,
  selectedCard: null, // tap 1: odaberi, tap 2: odigraj

  setRoom: (room) =>
    set({
      roomId: room?.id ?? null,
      room,
      game: room?.game ? normalize(room.game) : null,
    }),
  setChat: (chat) =>
    set((s) => ({
      chat,
      unread: s.chatOpen ? 0 : s.unread + Math.max(0, chat.length - s.chat.length),
    })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen, unread: 0 })),
  selectCard: (card) => set({ selectedCard: card }),
  reset: () => set({ roomId: null, room: undefined, game: null, chat: [], unread: 0, selectedCard: null }),

  /** Moje sjedište u trenutnoj sobi (ili -1). */
  mySeat: (uid) => {
    const { room } = get();
    if (!room?.players || !uid) return -1;
    for (let i = 0; i < 4; i++) if (room.players[i]?.uid === uid) return i;
    return -1;
  },
}));
