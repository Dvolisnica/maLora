// ─── Haptički feedback na mobilnim uređajima ────────────────────────────────
export function useHaptics() {
  const vibrate = (pattern = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  };
  return {
    tap: () => vibrate(10),         // odabir karte
    play: () => vibrate(25),        // igranje karte
    turn: () => vibrate([15, 60, 15]), // tvoj je red
    win: () => vibrate([30, 50, 30, 50, 80]),
  };
}
