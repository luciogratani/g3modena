# Prompt — lancio in due chat (doc prima, operativo dopo)

Due blocchi **indipendenti** da incollare in **due chat separate**, per non saturare il context:

1. **Chat A — Allineamento markdown ↔ codice/realtà**  
   Solo **controllo**: confronto tra `.md` e repo; **nessuna modifica** in quella chat (né `.md` né codice). Output = report discrepanze + cosa aggiornare **fuori chat** (tu a mano, o **un’altra chat** esplicitamente incaricata di patch/commit doc).

2. **Chat B — Piano operativo verso il lancio**  
   Da lanciare **dopo** che roadmap/note/README sono credibili (post-report A + correzioni, oppure dopo un giro di allineamento doc già fatto — vedi «Snapshot allineamenti» sotto).

La sezione **«Contesto operativo»** in fondo è materiale di riferimento per la chat B (e può essere allegata o letta dal repo).

### Snapshot allineamenti (2026-05-01, audit Prompt 1 — fasi 1–3)

Già applicato nel repo (non ripetere lo stesso lavoro salvo regressioni):

- **`docs/PROMPT_CHAT_E4_BOARD_CANDIDATES_SUPABASE.md`** — marcato implementato; uso storico/decisioni chiuse.
- **`docs/PROMPT_CHAT_BOARD_PROFILE_PHOTO_STORAGE.md`** — intestazione aggiornata (`applyCareersPhotoSignedUrls` / `candidates-repository.ts`); sintomo storico.
- **`docs/DEVELOPMENT_NOTES.md`** — Auth vs E5/L4; inventario filtri Nuovo con suffisso `{slug-sede}`; Cities legacy policy riscritta (focus Camerieri + Config › Sedi).
- **`supabase/README.md`** — checklist migrazioni estesa (00080, 00140, 00150); blocco evolutivo al posto della checklist E2→E5 lineare.
- **`docs/PRE_WIRING_CONCEPT.md`** — indice aggiornato (Auth #0, Scartati/A4 #3).
- **`docs/IMPLEMENTATION_ROADMAP.md`** — nota su `mockCandidates.ts` (tipi/DISCARD in bundle vs array `CANDIDATES` solo test).
- **`docs/DB_CMS_INTEGRATION.md`** — REST anon cities (`application-office-cities.ts`) vs assenza `@supabase/supabase-js` in `web`.

**Chat A resta utile** per: residui «da implementare», `admin:candidates:board:v1` citato come attuale, altri `PROMPT_CHAT_*` ancora «aperti», drift futuro codice↔doc.

**Chat B**: può assumere che quanto sopra sia vero e concentrarsi su **lancio operativo** + checklist roadmap `[ ]`.

---

## Controlli mirati opzionali (backlog audit — non obbligatori)

Eseguire a parte (grep/tool o Chat A mirata), quando tocchi quei domini:

| Area | Controllo |
|------|-----------|
| **Doc** | `rg` su `docs/` per: «da implementare», placeholder fuori contesto, «non usa client Supabase» senza qualifica REST, `admin:candidates:board:v1` come persistenza **attuale**. |
| **Indice concept** | `docs/PRE_WIRING_CONCEPT.md`: link relativi (`../supabase/` ecc.) ancora validi dopo spostamenti cartelle. |
| **Prompt storici** | `docs/PROMPT_CHAT_*.md`: header ancora «aperto» dove il lavoro è chiuso (oltre board/foto già sistemati). |
| **Contratti** | `CAMPAIGNS_CONTRACT.md`, `ANALYTICS_INGEST_CONTRACT.md` vs tipi/payload in `web/lib` e Edge — a campione quando si modificano quei flussi. |
| **Monorepo** | `web/package.json`: niente `@supabase/supabase-js`; uso pubblico = REST + Functions + env `VITE_*` (coerente con DB_CMS_INTEGRATION). |
| **Admin online** | `rg` con word-boundary su `CANDIDATES` in `admin/src`: l’array esportato deve comparire solo in `mockCandidates.ts` (import di tipi/cataloghi da quel file è ok). |
| **Ops** | `web/.env.example`: solo placeholder, mai chiavi/progetti reali versionati; CORS Functions vs nota wildcard in DEVELOPMENT_NOTES. |
| **CI locale** | Dopo cambi board/repository: `pnpm build:admin`, `pnpm test:board` (come DEVELOPMENT_NOTES). |

---

## Chat A — Prompt allineamento doc (copia da qui)

Sei nel monorepo **g3modena** (pnpm workspace: `web`, `admin`, `supabase/`).

### Vincolo della chat

- **Non modificare** file versionati **in questa conversazione**: niente patch su `docs/*.md`, `supabase/README.md`, né codice.
- Solo analisi e output nella chat. Le correzioni ai `.md` sono **fuori scope** qui (manuali o altra chat che applichi patch).

### Nota

Se nel repo risulta già uno «snapshot» di allineamento recente (`PROMPT_CHAT_MAIN_LAUNCH_READINESS.md` § snapshot), concentrati su **drift** e sul **backlog opzionale** sopra invece che rifare le stesse verifiche punto per punto.

### Compito

Verificare che la documentazione rifletta il codice e lo stato effettivo del progetto. Segnala **ogni** incoerenza con percorso file, evidenza (citazione checkbox o frase nei doc vs cosa trovi nel codice), e gravità (doc fuorviante, doc obsoleto, minore).

### Fonti doc da incrociare (priorità)

- `docs/IMPLEMENTATION_ROADMAP.md` — checkbox `[x]` / `[ ]`, date, «ultimo aggiornamento», gate L1–L5, E4 parziale.
- `docs/DEVELOPMENT_NOTES.md` — checklist, inventario localStorage, policy board, TODO pre-lancio, log operativo datato.
- `supabase/README.md` — funzioni citate, env, migrazioni elencate vs cartella `supabase/migrations/`.
- Opzionale se citano stato implementativo: `docs/DB_CMS_INTEGRATION.md`, `docs/PRE_WIRING_CONCEPT.md`, `docs/PROMPT_CHAT_*.md` (marcature «da implementare» vs codice già presente).

### Controlli suggeriti nel codice (campione mirato)

- Board candidati: uso `candidates-repository`; l’array **`CANDIDATES`** da `mockCandidates.ts` non importato nel percorso online (solo tipi/cataloghi ok).
- Web: `VITE_*` usate in `careers-form`, `contact-form`, `supabase-edge-invoke-headers`, fetch città.
- Admin: guard auth, adapter `cities`, `contact_messages`, eventuale signed URL foto in `candidates-repository`.
- Edge: cartelle `supabase/functions/*` coerenti con README.
- Migrazioni: elenco file in `supabase/migrations/` vs quanto dichiarato nei doc.

### Output atteso

1. **Riepilogo** «doc allineato / da aggiornare» (una frase).
2. **Tabella o lista discrepanze**: Doc | Affermazione | Realtà osservata | Azione consigliata (testuale).
3. **Lista prioritaria** di aggiornamenti `.md` (ordine consigliato), senza applicarli tu.

---

## Chat B — Prompt operativo lancio (copia da qui)

Sei nel monorepo **g3modena** (pnpm workspace: `web`, `admin`, `supabase/`).

### Premessa

I file **`docs/IMPLEMENTATION_ROADMAP.md`**, **`docs/DEVELOPMENT_NOTES.md`** e **`supabase/README.md`** sono **credibili** (audit Prompt 1 / fasi doc già applicate — vedi § «Snapshot allineamenti» nello stesso `PROMPT_CHAT_MAIN_LAUNCH_READINESS.md`). Non rivalidare tutta la codebase per ribaltare la roadmap: usa i doc come base e il codice solo per **dettagli operativi** o conferme puntuali.

### Compito

1. Sintetizza **fatto vs da fare** per un go-live ragionevole (web + admin + Supabase), usando sopratutto roadmap e DEVELOPMENT_NOTES.
2. Produci una **checklist ordinata per priorità**: bloccanti lancio vs post-lancio vs miglioramenti.
3. Nella **risposta**, incorpora esplicitamente i punti della sezione **«Contesto operativo»** più avanti nello **stesso** `PROMPT_CHAT_MAIN_LAUNCH_READINESS.md` (se allegato o letto dal repo): Vercel/`VITE_*`, Auth redirect admin, CORS Functions, bucket foto privato, ecc. Non modificare quel file salvo incarico separato di aggiornamento doc.

### Fonti (lettura mirata)

- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/DEVELOPMENT_NOTES.md`
- `supabase/README.md`
- Se serve contesto CMS/campagne/analytics: `docs/DB_CMS_INTEGRATION.md`, `docs/CAMPAIGNS_CONTRACT.md`, `docs/ANALYTICS_INGEST_CONTRACT.md`

### Output atteso

- Lista numerata **prossimi step verso il lancio** (deploy, env, sicurezza, contenuti L3, residui E3/E4/A5).
- Sezione **rischi** breve.
- Opzionale: **smoke test manuali** essenziali (senza ripetere interi paragrafi dei doc se già documentati).

---

## Contesto operativo (per Chat B — deploy e integrazioni)

Integrare nell’analisi operativa; validare sul codice solo se serve.

### Frontend (es. Vercel)

- Le variabili **`VITE_*`** sono inlined in **build**: definiti nel progetto di deploy prima del build; dopo modifica env serve **redeploy**.
- Due progetti distinti sono probabili (**`web`** e **`admin`**), con root directory monorepo e build pnpm workspace coerente.
- **Web** (minimo): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CAREER_ENDPOINT`, `VITE_CONTACT_ENDPOINT`, `VITE_CAREER_SUBMIT_FORMAT` (di norma `multipart`). `VITE_ANALYTICS_INGEST_URL` opzionale.
- **Admin** (minimo): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; opzionali come in `admin/.env.example`.
- Il gateway delle Edge Functions richiede **`Authorization: Bearer <anon>`** e **`apikey`**: il web usa `web/lib/supabase-edge-invoke-headers.ts`.

### Supabase Auth (admin)

- In **Authentication → URL configuration** aggiungere **Redirect URL** (e **Site URL** coerente) per il dominio produzione dell’admin.

### Storage candidature

- Bucket **`careers-photos`** è **privato**: in UI serve path risolto con **URL firmati** (`createSignedUrl` o equivalente), non il path grezzo come unico `src`.

### Sicurezza Functions

- Per produzione: whitelist **CORS** via `CAREERS_ALLOWED_ORIGINS` / `CONTACT_ALLOWED_ORIGINS` sui secrets delle funzioni (vedi `supabase/README.md`).
- **`SUPABASE_SERVICE_ROLE_KEY`** solo nei secrets Edge, mai in `VITE_*` o client.

### Storia nota (se i doc sono vecchi, la Chat A lo segnala)

- E4 è parziale: **cities**, **messaggi**, **board** su DB; tipicamente restano **camerieri** e **campagne** su persistenza locale fino a iter successiva.

---

## Nota uso

1. Apri **Chat A**, incolla il prompt **«Chat A — Prompt allineamento doc»**.
2. Applica gli aggiornamenti ai `.md` (tu, o un’altra chat esplicitamente dedicata alle **modifiche** doc).
3. Apri **Chat B**, incolla **«Chat B — Prompt operativo lancio»**; opzionale: allega questo file per la sezione contesto operativo.
