# 🂱 Lora — online kartaška igra za 4 igrača

Kompletna web aplikacija za igranje **tradicionalne Lore** (52 karte, 4 igrača, 7 kontrata, 28 dijeljenja). React + Vite frontend, Firebase backend (Authentication, Firestore, Realtime Database). Mobile-first PWA s tamnom temom, animacijama, ELO leaderboardom, achievementima i chatom.

## Pravila igre

Lora je igra **izbjegavanja bodova** — pobjeđuje igrač s **najmanje** bodova nakon 28 dijeljenja. Diler se rotira svako dijeljenje i bira jedan od svojih još neodigranih kontrata (svaki igrač odigra svih 7):

| Kontrat | Bodovi |
|---|---|
| **Štihovi** | svaki uzeti štih +1 (ukupno 13) |
| **Herčevi** | svaki uzeti herc +1 (ukupno 13) |
| **Dame** | svaka uzeta dama +2 (ukupno 8) |
| **Kralj herc** | K♥ donosi +8 |
| **Zadnja dva** | pretposljednji i posljednji štih po +4 |
| **Maksimum** | sve gore navedeno zajedno (ukupno 50) |
| **Lora** | slaganje karata u nizove; prvi bez karata 0, ostali +1 po preostaloj karti |

Štih-kontrati: mora se poštovati tražena boja, nema aduta, najjača karta tražene boje nosi štih. Lora kontrat: prva odigrana karta određuje početni rank sva 4 niza; nizovi rastu kružno (A→2); ko nema poteza, automatski je PAS.

## Struktura projekta

```
src/
├── components/   # UI: SVG karte, lepeza ruke, stol, chat, scoreboard, konfete…
├── game/         # Logika Lore: engine, kontrati, špil, ELO, achievements, profanity filter
├── firebase/     # Auth (Google), Firestore (profili/leaderboard), RTDB (sobe/potezi/chat)
├── hooks/        # useRoomSync, useTurnTimer, useHaptics
├── store/        # Zustand: auth, game, UI
└── pages/        # Login, Home, Lobby, Game, Profile, Leaderboard
```

**Arhitektura multiplayer-a (besplatni Spark plan, bez Cloud Functions):** stanje partije živi u Realtime Database. Svaki potez se upisuje kroz **RTDB transakciju** u kojoj isti deterministički engine (`src/game/engine.js`) validira i primjenjuje potez — nevalidan potez se odbija na svim klijentima. Statistike i ELO upisuje svaki igrač **isključivo u svoj** Firestore dokument (security rules ne dozvoljavaju ništa drugo), a ELO delte su deterministične pa svi izračunaju iste vrijednosti.

> Napomena: bez server-side koda igrač tehnički vješt može vidjeti tuđe karte u RTDB. Za casual igru s prijateljima ovo je prihvatljiv kompromis besplatnog plana; za potpunu anti-cheat zaštitu kasnije dodaj Cloud Functions (Blaze plan) i premjesti dijeljenje karata + validaciju na server.

## Setup Firebase projekta

1. **Kreiraj projekat** na [console.firebase.google.com](https://console.firebase.google.com) → *Add project*.
2. **Authentication**: *Build → Authentication → Get started → Sign-in method* → uključi **Google**. U *Settings → Authorized domains* dodaj svoj domen (localhost je već tu).
3. **Firestore**: *Build → Firestore Database → Create database* → production mode, region po želji (npr. `europe-west`).
4. **Realtime Database**: *Build → Realtime Database → Create database* → locked mode. Zabilježi URL baze.
5. **Web app**: *Project settings → General → Your apps → Web (`</>`)* → registruj app i prepiši config vrijednosti.
6. **Lokalna konfiguracija**:
   ```bash
   cp .env.example .env
   # popuni VITE_FIREBASE_* vrijednosti iz koraka 5 + URL RTDB iz koraka 4
   ```
7. **Security rules** — deploy pomoću Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # izaberi svoj projekat
   firebase deploy --only firestore:rules,database
   ```
   (Pravila su u `firestore.rules` i `database.rules.json`.)
8. **Firestore indeks za sedmični leaderboard**: prvi put kad otvoriš tab "Ove sedmice", konzola browsera će ispisati link *create index* — klikni ga (composite indeks: `weekKey ASC, weeklyWins DESC` na kolekciji `users`). Globalni leaderboard radi odmah.

## Pokretanje lokalno

```bash
npm install
npm run dev          # http://localhost:5173
```

Za test multiplayer-a otvori 4 taba/browsera s 4 različita Google naloga (ili koristi Chrome profile).

## Deployment

### Opcija A: Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```
`firebase.json` je već konfigurisan (SPA rewrite, cache headeri).

### Opcija B: Vercel
```bash
npm i -g vercel
vercel               # framework: Vite, build: npm run build, output: dist
```
U Vercel dashboardu (*Settings → Environment Variables*) dodaj sve `VITE_FIREBASE_*` varijable, a u Firebase *Authentication → Authorized domains* dodaj svoj `*.vercel.app` domen. Za SPA rute dodaj `vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## PWA

Aplikacija se može **instalirati na mobitel** (Add to Home Screen): `public/manifest.json` + `public/sw.js` (service worker se registruje samo u produkcijskom buildu). Ikone su u `public/icons/`.

## Funkcionalnosti

- 🔐 Google OAuth login, persistent session, profil s avatarom
- 🔒 Privatne sobe sa 6-znakovnim kodom · 🌍 javni matchmaking (auto-spajanje 4 igrača)
- ⏱ Lobby s countdownom · glasanje za restart (4/4) i prekid partije (3/4)
- 🎴 Puna pravila tradicionalne Lore, validacija poteza na svim klijentima (nemoguće odigrati nevalidnu kartu)
- ✨ Animacije (Framer Motion): dijeljenje, igranje, skupljanje štiha · haptički feedback (`navigator.vibrate`)
- ⏳ 30 s po potezu s automatskim potezom po isteku (+ host fallback za offline igrače)
- 🏆 Globalni + sedmični leaderboard (top 50), ELO sistem, rang bedževi (Početnik → Legenda)
- 📈 Profil: partije/pobjede/win rate, Ø bodova, najduži niz, ELO graf zadnjih 20 partija (Recharts)
- 🎖 Achievements s toast notifikacijama (Prva pobjeda, 10/50/100 pobjeda, Savršena partija, Streaker, Socijalist)
- 💬 In-game chat: brzi odgovori, slobodan tekst (max 200 znakova), bs/hr/sr profanity filter
- 🌙 Tamna tema po defaultu (deep green), opcija svijetle teme · responsive 320–1920 px · ARIA + tastatura
