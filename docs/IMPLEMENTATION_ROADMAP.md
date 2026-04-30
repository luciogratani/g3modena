# Roadmap implementazione (pre-wiring)

Sequenza concordata per arrivare al **wiring Supabase** e all’**Auth** per ultimi. Usa le checkbox per segnare l’avanzamento.

Documenti di riferimento: [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md), [`DB_CMS_INTEGRATION.md`](DB_CMS_INTEGRATION.md), [`CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md), [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md).

---

## Fase A — Admin UI e stato locale

- [x] **A1 — Campagne (MVP)**  
  Sidebar Marketing › Campagne, builder UTM + `cid`, anteprima creativa, metriche/demo, base URL (`VITE_PUBLIC_SITE_ORIGIN`). Nessun DB.

- [x] **A2 — Città / sedi**  
  Gestione locale in **Config › Sedi**: tipo `OfficeCity` (`id`, `slug`, `displayName`, `isActive`, `sortOrder`). Storage `admin:cities:v1`, evento `admin:cities:updated`, export `listActiveCities()` per Step A3. Eliminate fisiche bloccate per slug legacy `modena` / `sassari`.

- [x] **A3 — Board e sidebar candidati dinamiche**  
  Sidebar **Candidati** e titoli pagina da **`listActiveCities()`** (ordine `sortOrder`); badge “Nuovo” per **slug** (`Record<string, number>`). Stato **`Page`**: `{ kind: static }` \| `{ kind: candidates, citySlug }` \| `{ kind: waiters, citySlug }`. Listener **`admin:cities:updated`** per ricalcolo città + badge. Board/parametri (`CandidatiBoard`, `board-utils`, `useCandidateBoardState`, `useNewColumnFilters`, `KanbanColumn`) su **slug stringa** generica. `getCandidateCityLabel()` da slug arbitrario (title case da `-`). **Camerieri:** stessa lista città attive ma **filtrata** a slug con storage supportato (`modena`, `sassari` — `SUPPORTED_WAITER_CITY_SLUGS` in `App.tsx`) fino ad estensione CRM multi-sede.

- [ ] **A4 — Quinta colonna board**  
  Da definire con workflow negli appunti; estensione modello/colonne pipeline se necessario.

- [ ] **A5 — Overview / dashboard**  
  Collegare KPI a dati reali o semi-reali (messaggi, pipeline, traffico) come da concept; senza tabella analytics dedicata finché non serve.

---

## Fase B — Sito pubblico (`web`)

- [x] **B1 — Step form “Scegli la città” (sede di candidatura)**  
  Mirror locale **`web/data/application-office-cities.ts`** (`slug`, `displayName`, `sortOrder`), allineamento manuale con admin finché non c’è API `cities`. Nuovo **step 1** in `careers-form.tsx` (“Per quale sede ti candidi?”), **5 step** totali; **`city`** resta **residenza** negli step successivi. Payload JSON + multipart: **`officeCitySlug`**. Focus/accessibilità migliorati tra step.

- [x] **B2 — Propagazione UTM + `cid`**  
  Adapter web `campaign-attribution`: lettura query (`cid`, `utm_*`) da URL, persistenza in `sessionStorage` (`web:campaign-attribution:v1`) e propagazione nel submit candidature JSON/multipart (`cid`, `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`) in `careers-form.tsx`.

---

## Fase C — Analytics lato client (prima del DB)

- [x] **C1 — Sessione funnel e `event_type` v1**  
  `web/lib/analytics.ts`: `getOrCreateSessionId()` → **`web:analytics:session-id:v1`**; funnel careers **`web:analytics:careers:funnel-attempt-id:v1`** + `clearCareersFunnelAttemptId` dopo submit; union **`AnalyticsEventType`** allineata al concept (`page_view`, `cta_click`, `careers_form_open`, `careers_step_view`, `careers_abandon`, `careers_submit`); buffer **`web:analytics:buffer:v1`** (max 200 eventi); log **`[analytics/local]`** in dev; UTM + **`cid`** denormalizzati su ogni record da campaign attribution. **`App.tsx`**: `page_view` dopo capture attribution. **`careers-form.tsx`**: `careers_form_open`, `careers_step_view` (step index), `careers_submit` con `citySlug` / `funnelAttemptId`.

- [x] **C2 — Inventario `cta_key`**  
  Costante/module condiviso allineato a [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md) (inventario CTA).  
  2026-04-30: introdotti `web/lib/analytics-cta-keys.ts`, helper `trackCtaClick` in `web/lib/analytics.ts`, wiring click in `web/components/navbar.tsx`, `web/components/hero.tsx`, `web/components/footer.tsx`.

- [x] **C3 — `careers_abandon`**  
  Implementato in `careers-form.tsx` con listener best-effort `visibilitychange` (`hidden`) + `pagehide`; dedup max 1 evento per `funnel_attempt_id` tramite chiavi sessione versionate (`abandon-sent` / `submit-sent`) in `web/lib/analytics.ts`.

- [x] **C4 — Invio eventi**  
  Adapter ingest HTTP configurabile (`VITE_ANALYTICS_INGEST_URL`) con flush periodico + lifecycle (`visibilitychange`/`pagehide`) e retry su buffer locale; swap successivo → `INSERT` su `analytics_events` in Supabase.
  2026-05-01: completato in `web/lib/analytics.ts` (buffer ops + signal update), `web/lib/analytics-ingest.ts` (adapter flush/retry), bootstrap in `web/src/App.tsx`, env in `web/.env.example`, mock locale `web/scripts/mock-analytics-ingest.mjs`.

---

## Fase D — Schema e revisione

- [ ] **D1 — Audit ERD**  
  Eseguire prompt in [`AGENT_PROMPT_ERD_AUDIT.md`](AGENT_PROMPT_ERD_AUDIT.md); allineare Mermaid + `DB_CMS_INTEGRATION` §12 se necessario.

---

## Fase E — Backend (ultima ondata)

- [ ] **E1 — Migrazioni Supabase**  
  Tabelle (`cities`, `candidates`, `staff`, `campaigns`, `cms_sections`, `contact_messages`, `analytics_events`, …), indici.

- [ ] **E2 — RLS**  
  Matrice anon (sito) vs authenticated (admin) come da concept; rate limit / validazione submit.

- [ ] **E3 — Storage**  
  Media campagne, allegati candidature, policy bucket.

- [ ] **E4 — Adapter admin**  
  Sostituzione `localStorage` (board, camerieri, città, campagne, messaggi…) con fetch Supabase.

- [ ] **E5 — Pagina Auth + guard**  
  Login Supabase Auth, UI allineata al gestionale, protezione route admin.

---

## Gate pre-lancio — cosa è bloccante

Sintesi dai TODO in [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) (careers receiver, § «TODO pre-lancio effettivo», smoke Camerieri). **Bloccante** = rischio perdita dati, UX rotta in prod, o superficie admin esposta senza protezione.

### Bloccanti tipici prima di produzione «vera»

- [ ] **L1 — Receiver candidature (`VITE_CAREER_ENDPOINT`)**  
  Backend/receiver legge e **persiste** dal payload web **`officeCitySlug`** e campi **attribution** (`cid`, `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`). Senza questo i dati inviati dal sito sono incompleti per recruiting e campagne (vedi TODO in `careers-form` builders e DEVELOPMENT_NOTES § Web careers).

- [ ] **L2 — Form contatti (`VITE_CONTACT_ENDPOINT`) + inbox admin**  
  Endpoint che riceve il submit **operativo** (nessun errore silenzioso lato utente). Se più operatori o più macchine: **persistenza condivisa** messaggi (`contact_messages` / equivalente) e gestione stato in admin — altrimenti i messaggi restano solo nel localStorage della singola postazione (DEVELOPMENT_NOTES: «Contatti > Messaggi backend wiring»).

- [ ] **L3 — Strategia contenuti sito pubblico**  
  Una delle due: deploy **statico** da contenuti già consolidati nell’artifact di build **oppure** lettura CMS da DB **production-safe** (schema/RLS/fallback) — DEVELOPMENT_NOTES: «CMS wiring production-safe» + «Web runtime da DB».

- [ ] **L4 — Sicurezza gestionale**  
  Auth + guard sulle route admin **prima** di pubblicare URL del gestionale — DEVELOPMENT_NOTES: «Auth/protezione admin» (allinea a **E5** quando il backend è pronto).

- [ ] **L5 — Persistenza pipeline candidati condivisa** *(bloccante solo se il go-live richiede team multi-dispositivo)*  
  Board e stato candidati non possono restare solo in `localStorage` del browser — DEVELOPMENT_NOTES: «Board persistence server-side». Per demo single-browser può restare differito insieme a **E4**.

### Di solito non bloccanti per un primo rilascio / demo

- **C4** — flush/export analytics (buffer già presente; utile ma non impedisce il sito).
- **A4 / A5** — quinta colonna board, dashboard KPI raffinati.
- **D1** — audit ERD (preparazione schema; va fatto prima del backend grosso ma non blocca una landing statica).
- Smoke test manuali Camerieri, dialog «Crea Cameriere» completo, refactor frammentazione (`CandidatiBoard`, `careers-form`, …) — qualità/tech debt, non prerequisito minimo funzionale.

---

## Legenda aggiornamenti

Quando completi una voce, imposta `- [x]` e opzionalmente aggiungi una riga data o riferimento PR sotto la voce.

Ultimo aggiornamento checklist: milestone **C4** ingest analytics (2026-05-01); gate **L1–L5** e milestone **C2** (2026-04-30). Prossimo focus tecnico consigliato: **D1** (audit ERD), gate **L1–L4**, oppure **A4** / **A5** (admin UI).
