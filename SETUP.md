# Lora — detaljan setup projekta (od nule do produkcije)

## 0. Preduslovi

| Alat | Verzija | Provjera |
|---|---|---|
| Node.js | 18+ (preporučeno 20 LTS) | `node -v` |
| npm | 9+ | `npm -v` |
| Google nalog | — | za Firebase konzolu |

Node preuzmi s [nodejs.org](https://nodejs.org). Projekat raspakuj (`lora.zip`) ili koristi folder `lora/`.

---

## 1. Kreiranje Firebase projekta

1. Otvori [console.firebase.google.com](https://console.firebase.google.com) i prijavi se.
2. **Add project** → ime npr. `lora-igra` → Continue.
3. Google Analytics: **isključi** (nije potreban) → **Create project**.

## 2. Authentication (Google login)

1. U lijevom meniju: **Build → Authentication → Get started**.
2. Tab **Sign-in method** → **Add new provider → Google** → Enable.
3. Postavi *Project support email* (tvoj mail) → **Save**.
4. Tab **Settings → Authorized domains**: `localhost` je već dodan. Kasnije ovdje dodaješ produkcijski domen (npr. `lora-igra.web.app` ili `tvoj-projekat.vercel.app`).

## 3. Firestore (profili, statistike, leaderboard)

1. **Build → Firestore Database → Create database**.
2. Lokacija: `europe-west3 (Frankfurt)` ili najbliža → Next.
3. **Start in production mode** → Create. (Prava pravila deployamo u koraku 6.)

## 4. Realtime Database (sobe, potezi, chat)

1. **Build → Realtime Database → Create database**.
2. Lokacija: `Belgium (europe-west1)` → Next.
3. **Start in locked mode** → Enable.
4. **Zabilježi URL baze** s vrha ekrana, npr.:
   `https://lora-igra-default-rtdb.europe-west1.firebasedatabase.app`
   (treba ti za `.env` — obavezno puni URL s `https://`).

## 5. Registracija web aplikacije i `.env`

1. **Project settings** (zupčanik gore lijevo) → **General → Your apps → Web** (ikona `</>`).
2. Nadimak npr. `lora-web`, **ne** označavaj Firebase Hosting (može i kasnije) → **Register app**.
3. Prikazaće se `firebaseConfig` objekat. U folderu projekta:

```bash
cp .env.example .env
```

4. Popuni `.env` vrijednostima iz konfiguracije (mapiranje 1:1):

```bash
VITE_FIREBASE_API_KEY=AIzaSy...                                  # apiKey
VITE_FIREBASE_AUTH_DOMAIN=lora-igra.firebaseapp.com              # authDomain
VITE_FIREBASE_PROJECT_ID=lora-igra                               # projectId
VITE_FIREBASE_STORAGE_BUCKET=lora-igra.appspot.com               # storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012                   # messagingSenderId
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123...                # appId
VITE_FIREBASE_DATABASE_URL=https://lora-igra-default-rtdb.europe-west1.firebasedatabase.app
```

> `databaseURL` se ponekad ne prikazuje u config snippetu — uzmi ga iz koraka 4.4.
> `.env` je u `.gitignore` — nikad ga ne commituj.

## 6. Deploy security rules

```bash
npm install -g firebase-tools
firebase login                      # otvara browser
cd lora                             # root projekta
firebase use --add                  # izaberi svoj projekat, alias npr. "default"
firebase deploy --only firestore:rules,database
```

Ovo postavlja `firestore.rules` (profili: čita svako prijavljen, piše samo vlasnik; ELO ograničen na ±100 po upisu) i `database.rules.json` (sobe/potezi/chat samo za članove sobe, chat max 200 znakova).

**Provjera:** Firebase konzola → Firestore → Rules tab treba pokazivati tvoja pravila (ne `allow read, write: if false`).

## 7. Pokretanje lokalno

```bash
npm install
npm run dev
```

Otvori `http://localhost:5173` → "Prijavi se Google nalogom" → trebao bi se kreirati tvoj profil (provjeri: Firestore → Data → kolekcija `users`).

### Test multiplayera na jednoj mašini
Treba ti **4 različita Google naloga**:
- otvori 4 Chrome **profila** (ne taba — isti profil dijeli sesiju), ili
- kombinuj normalni + incognito + drugi browser (Firefox/Edge).

Jedan igrač: *Kreiraj privatnu sobu* → podijeli 6-znakovni kod → ostala trojica: *Uđi s kodom*. Kad su sva 4 u lobby-ju kreće countdown i partija.

### Test s mobitela u lokalnoj mreži
```bash
npm run dev -- --host
```
Otvori prikazani `http://192.168.x.x:5173` na mobitelu. Za Google login s te adrese dodaj IP u *Authentication → Authorized domains* (ili testiraj login samo preko localhost/produkcije).

## 8. Firestore indeks za sedmični leaderboard

Globalni leaderboard radi odmah. Sedmični (filter `weekKey` + sort `weeklyWins`) traži composite indeks:

1. Otvori app → Leaderboard → tab **"Ove sedmice"**.
2. U browser konzoli (F12) pojaviće se greška s linkom `https://console.firebase.google.com/.../create_composite=...` → klikni link → **Create index**.
3. Indeks se gradi ~1–2 min; nakon toga tab radi.

(Ručno: Firestore → Indexes → Composite → kolekcija `users`, polja `weekKey ASC` + `weeklyWins DESC`.)

---

## 9. Deployment

### Opcija A — Firebase Hosting (preporučeno, sve na jednom mjestu)

```bash
npm run build
firebase init hosting     # SAMO ako firebase.json ne prepozna hosting; public dir: dist, SPA: yes, ne prepisuj index.html
firebase deploy --only hosting
```

App je na `https://<projekat>.web.app`. Taj domen je automatski u Authorized domains → login radi odmah.

> `.env` vrijednosti se ugrađuju u bundle pri `npm run build` — nakon izmjene `.env` uvijek ponovo buildaj.

### Opcija B — Vercel

```bash
npm i -g vercel
vercel
```
- Framework preset: **Vite** (build `npm run build`, output `dist`).
- **Settings → Environment Variables**: dodaj svih 7 `VITE_FIREBASE_*` varijabli → Redeploy.
- Kreiraj `vercel.json` u rootu (SPA rute):
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- Firebase konzola → Authentication → **Authorized domains** → dodaj `tvoj-projekat.vercel.app`.

## 10. PWA — instalacija na mobitel

Service worker se registruje samo u produkcijskom buildu (ne u `npm run dev`).

- **Android/Chrome**: otvori produkcijski URL → meni ⋮ → *Add to Home screen / Instaliraj aplikaciju*.
- **iOS/Safari**: Share → *Add to Home Screen*.

Lokalna provjera PWA: `npm run build && npm run preview` → `http://localhost:4173`.

---

## 11. Troubleshooting

| Problem | Uzrok / rješenje |
|---|---|
| `auth/unauthorized-domain` pri loginu | Dodaj domen u Authentication → Settings → Authorized domains. |
| `PERMISSION_DENIED` u konzoli | Rules nisu deployane (korak 6) ili pogrešan `VITE_FIREBASE_DATABASE_URL`. |
| Bijeli ekran nakon deploya | Nedostaju env varijable na hostingu (Vercel) ili nije buildano nakon izmjene `.env`. |
| Sedmični leaderboard prazan/greška | Indeks iz koraka 8 nije kreiran. |
| Login popup se odmah zatvori | Browser blokira popup → app automatski pada na redirect; dozvoli popupe za domen. |
| `databaseURL` nedefinisan | U `.env` mora biti puni URL s `https://` iz koraka 4.4. |
| 4. igrač ne može u sobu | Soba je puna ili je kod istekao (soba obrisana) — kreiraj novu. |

## 12. Troškovi (Spark — besplatni plan)

Sve korišteno (Auth, Firestore, RTDB, Hosting) je na besplatnom planu. Limiti: RTDB 100 istovremenih konekcija (~25 partija u isto vrijeme), Firestore 50k čitanja/dan, Hosting 10 GB/mjesec — više nego dovoljno za igru s prijateljima. Kartica nije potrebna.
