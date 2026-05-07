# Prompt Chat - B3 Site Mode Switch (maintenance / careers-only)

Contesto: monorepo `g3modena` (`web`, `admin`, `supabase`), L3 chiuso in modalita static-first.

Obiettivo: introdurre da pannello admin un controllo runtime che permetta di commutare il sito pubblico tra:

- `normal` (default, comportamento attuale),
- `maintenance` (sito in manutenzione),
- `careers_only` (mostra solo il form candidature).

---

## Naming e contratto proposto

Usare naming tecnico unico e stabile:

- chiave: `site_mode`
- valori: `normal | maintenance | careers_only`

Questi nomi devono essere usati in DB, admin, web e documentazione.

---

## Task 1 - Contratto dati + persistenza

1. Definire dove persistere `site_mode` (preferenza: tabella settings dedicata, semplice e globale).
2. Aggiungere migrazione SQL minimale (schema-only, no seed business):
   - colonna/record per `site_mode`,
   - vincolo CHECK sui valori ammessi,
   - default `normal`.
3. Allineare RLS/policy:
   - `authenticated`: update/read da admin,
   - `anon`: read minimo necessario se il web deve leggerlo direttamente.

**Done:** DB remoto leggibile/scrivibile in modo coerente, con default sicuro.

---

## Task 2 - Admin control surface

1. Scegliere collocazione UI iniziale (consigliato: `Config`).
2. Implementare un controllo esplicito (radio/select) con etichette chiare:
   - Normale
   - Manutenzione
   - Solo candidature
3. Salvataggio su DB + feedback UX (loading/success/error).

**Done:** un admin autenticato puo cambiare `site_mode` senza SQL manuale.

---

## Task 3 - Runtime web behavior

1. In bootstrap web leggere `site_mode` (con fallback robusto a `normal` se errore rete/config).
2. Applicare gate runtime:
   - `normal`: sito invariato,
   - `maintenance`: render pagina manutenzione dedicata (placeholder ok per v1),
   - `careers_only`: render esclusivo del form candidature (niente navigazione standard).
3. Mantenere il percorso compatibile con L3 static-first (nessuna dipendenza CMS runtime nel path principale).

**Done:** cambio mode visibile sul web dopo reload, senza rompere il flusso esistente.

---

## Task 4 - Smoke test e regressione minima

1. Verifica manuale dei 3 stati (`normal`, `maintenance`, `careers_only`).
2. Verifica submit form Careers in `careers_only`.
3. Verifica che Contact/Home tornino in `normal`.
4. Build minima:
   - `pnpm build:web`
   - `pnpm build:admin`

**Done:** build verde e smoke funzionale base.

---

## Task 5 - Documentazione e chiusura step

Aggiornare in modo coerente:

- `docs/IMPLEMENTATION_ROADMAP.md` (B3 stato e nota),
- `docs/DEVELOPMENT_NOTES.md` (decisioni + smoke),
- eventuale file operativo dedicato se necessario.

Output finale chat:

1. file toccati,
2. rationale sintetico,
3. esito test/build,
4. eventuali rischi residui.

---

## Vincoli

- Non introdurre dipendenze non necessarie.
- Non cambiare scope sicurezza DNS/CORS (fuori task).
- Evitare refactor ampi non collegati a B3.
