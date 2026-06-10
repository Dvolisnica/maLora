// ─── Profanity filter (bs/hr/sr) ────────────────────────────────────────────
// Normalizuje dijakritike i leet-speak pa maskira pogotke zvjezdicama.

const WORDS = [
  'jebem', 'jebi', 'jebo', 'jeben', 'jebote', 'zajebi', 'sjeban',
  'kurac', 'kurcu', 'kurca', 'kurvo', 'kurva', 'kurve',
  'picka', 'picku', 'picke', 'pickica', 'pizda', 'pizdo', 'pizdu',
  'sranje', 'seronja', 'govno', 'govna', 'usrani',
  'budala', 'budalo', 'debil', 'debilu', 'kreten', 'kretenu', 'idiot', 'idiote',
  'majmun', 'majmune', 'stoka', 'smece', 'djubre', 'dubre',
  'fukara', 'drolja', 'drolju', 'koza', 'krava glupa',
  'mater ti', 'majku ti', 'mamu ti', 'sve ti jebem',
];

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's')
    .replace(/\s+/g, ' ');
}

/** Vrati tekst s maskiranim psovkama: "jebem" → "j***m". */
export function cleanText(text) {
  let out = text;
  const norm = normalize(text);
  for (const w of WORDS) {
    let idx = 0;
    while ((idx = norm.indexOf(w, idx)) !== -1) {
      const mask = out[idx] + '*'.repeat(Math.max(1, w.length - 2)) + (w.length > 1 ? out[idx + w.length - 1] : '');
      out = out.slice(0, idx) + mask.slice(0, w.length) + out.slice(idx + w.length);
      idx += w.length;
    }
  }
  return out;
}

export function hasProfanity(text) {
  const norm = normalize(text);
  return WORDS.some((w) => norm.includes(w));
}
