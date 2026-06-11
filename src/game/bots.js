// ─── Botovi ─────────────────────────────────────────────────────────────────
// Bot igrače pokreće host klijent (useBotPlayer hook). Partije s botovima
// se NE računaju u statistike i ELO (da se leaderboard ne može "farmati").

export const BOT_NAMES = ['Mujo', 'Suljo', 'Fata', 'Haso'];

export const isBotUid = (uid) => typeof uid === 'string' && uid.startsWith('bot-');

export const botAvatar = () =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#1b4737"/><text x="32" y="43" font-size="30" text-anchor="middle">\u{1F916}</text></svg>'
  );

export function makeBot(seat, idx) {
  return {
    uid: `bot-${seat}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: `${BOT_NAMES[idx % BOT_NAMES.length]} \u{1F916}`,
    photo: botAvatar(),
    elo: 1000,
    isBot: true,
  };
}
