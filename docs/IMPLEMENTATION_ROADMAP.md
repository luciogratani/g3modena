# Roadmap implementazione (pre-wiring)

Sequenza concordata per arrivare al **wiring Supabase** e all’**Auth** per ultimi. Usa le checkbox per segnare l’avanzamento.

Documenti di riferimento: [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md), [`DB_CMS_INTEGRATION.md`](DB_CMS_INTEGRATION.md), [`CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md), [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md), [`ANALYTICS_INGEST_CONTRACT.md`](ANALYTICS_INGEST_CONTRACT.md). Smoke manuale gestionale: [`SMOKE_TEST_ADMIN.md`](SMOKE_TEST_ADMIN.md).

---

## Fase A — Admin UI e stato locale

- [x] **A1 — Campagne (MVP → DB)**  
  Sidebar Marketing › Campagne, builder UTM + `cid`, anteprima creativa (`campaign-previews`), lista su **`public.campaigns`**, metriche card ancora senza ingest aggregato (`VITE_PUBLIC_SITE_ORIGIN` per base URL default); timeline **`first_data_at`/`last_data_at`** solo ingest (vedi **DEVELOPMENT_NOTES**).

- [x] **A2 — Città / sedi**  
  UI **Config › Sedi** (`OfficeCity`). Storicamente `localStorage` (`admin:cities:v1`); **E4 (2026-05-01):** `public.cities` via Supabase autenticato, evento `admin:cities:updated` mantenuto per sidebar, nessun import automatico dal vecchio storage. Regole eliminazione legacy `modena` / `sassari` + messaggi FK.

- [x] **A3 — Board e sidebar candidati dinamiche**  
  Sidebar **Candidati** e titoli pagina da **`listActiveCities()`** (ordine `sortOrder`); badge “Nuovo” per **slug** (`Record<string, number>`). Stato **`Page`**: `{ kind: static }` \| `{ kind: candidates, citySlug }` \| `{ kind: waiters, citySlug }`. Listener **`admin:cities:updated`** per ricalcolo città + badge. Board/parametri (`CandidatiBoard`, `board-utils`, `useCandidateBoardState`, `useNewColumnFilters`, `KanbanColumn`) su **slug stringa** generica. `getCandidateCityLabel()` da slug arbitrario (title case da `-`). **Camerieri:** stessa lista **città attive** della sidebar Candidati (**`activeCities`** in `App.tsx`); CRM su **`public.staff`** (2026-05-02).

- [x] **A4 — Quinta colonna board "Scartati"** (2026-05-01)  
  Quinta colonna kanban dedicata agli scarti con motivazione strutturata. Catalogo ragioni v1 (`DiscardReasonKey`, 8 chiavi: `not_a_fit`, `no_show`, `declined_by_candidate`, `unreachable`, `duplicate`, `failed_interview`, `failed_training`, `other`) + nota opzionale (obbligatoria se `other`, max 500 char). Entry: context menu **Scarta** + drop su colonna; il move avviene solo dopo conferma del dialog. Ripristino tramite **Ripristina** (context menu / sheet) che usa `discardReturnStatus` con fallback `nuovo`. Cleanup metadata simmetrico a `postpone` (`clearDiscardMetadataIfNeeded`). DB: migrazione `20260501000080_alter_candidates_discard.sql` estende `pipeline_stage` CHECK e aggiunge colonne `discard_reason_key`, `discard_reason_note`, `discarded_at`, `discard_return_status` con CHECK whitelistati e indice parziale.

- [ ] **A5 — Overview / dashboard**  
  Collegare KPI a dati reali o semi-reali (messaggi, pipeline, traffico) come da concept; senza tabella analytics dedicata finché non serve.

---

## Fase B — Sito pubblico (`web`)

- [x] **B1 — Step form “Scegli la città” (sede di candidatura)**  
  Lista sedi da **`public.cities`** via REST anon (soli `is_active`, ordine `sort_order`); fallback statico **`application-office-cities.ts`** solo se env Supabase assente o fetch fallisce. Step 1 in `careers-form.tsx`, **5 step**; **`city`** = residenza negli step successivi; payload **`officeCitySlug`**.

- [x] **B2 — Propagazione UTM + `cid`**  
  Adapter web `campaign-attribution`: lettura query (`cid`, `utm_*`) da URL, persistenza in `sessionStorage` (`web:campaign-attribution:v1`) e propagazione nel submit candidature JSON/multipart (`cid`, `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`) in `careers-form.tsx`.

- [x] **B3 — Site Mode Switch (maintenance / careers-only)**  
  2026-05-07: introdotto contratto unico **`site_mode`** (`normal | maintenance | careers_only`) su `public.site_settings` con RLS `authenticated` admin + lettura `anon` minima. Admin: controllo in **Config › Impostazioni** con radio e salvataggio DB. Web: bootstrap runtime legge `site_mode` via REST anon con fallback sicuro a `normal`; `maintenance` mostra pagina dedicata, `careers_only` mostra solo il form candidature.

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
  2026-05-01: completato in `web/lib/analytics.ts` (buffer ops + signal update), `web/lib/analytics-ingest.ts` (adapter flush/retry), bootstrap in `web/src/App.tsx`, env in `web/.env.example`, mock locale `web/scripts/mock-analytics-ingest.mjs`, contratto endpoint [`ANALYTICS_INGEST_CONTRACT.md`](ANALYTICS_INGEST_CONTRACT.md).

---

## Fase D — Schema e revisione

- [x] **D1 — Audit ERD**  
  Eseguito audit schema/contratti; risolti mismatch v1 tra ERD concettuale e contratti operativi (campaigns, candidates.languages, analytics ingest, cms tenant key).
  2026-05-01: audit consolidato in `supabase/README.md` + note in `docs/DEVELOPMENT_NOTES.md`.

---

## Fase E — Backend (ultima ondata)

- [x] **E1 — Migrazioni Supabase**  
  Tabelle (`cities`, `candidates`, `staff`, `campaigns`, `cms_sections`, `contact_messages`, `analytics_events`) con indici e vincoli minimi v1 (schema-only, senza seed mock/business).
  2026-05-01: creato set `supabase/migrations/20260501000000`…`20260501000070`.

- [x] **E2 — RLS** (2026-05-01)  
  Abilitazione RLS (`20260501000090`), policy **authenticated** admin (`00100`), policy **anon** superficie pubblica (`00110`), bridge lookup campagne (`00120`), grant/hardening (`00130`). Smoke SQL: `supabase/sql/e2c_rls_smoke_allow_deny.sql`.  
  **Segue fuori scope DB:** rate limiting / anti-abuso sul submit pubblico → da affrontare con receiver dedicato (**L1**) o Edge.

- [ ] **E3 — Storage**  
  Media campagne, allegati candidature, policy bucket.  
  2026-05-01: completata la parte bloccante per **L1** (`careers-photos`, `careers-cv` privati + read admin autenticato in `20260501000140_e3_storage_careers.sql`). **2026-05:** bucket **`campaign-previews`** + policy authenticated (`20260501000160_e3_storage_campaign_previews.sql`); restano **media CMS** oltre baseline.

- [ ] **E4 — Adapter admin**  
  Sostituzione `localStorage` (board, camerieri, campagne, …) con fetch Supabase.  
  2026-05-01: **messaggi** (`contact_messages`) + Edge `contact-submissions`; **sedi** `public.cities` (admin autenticato + web anon + fallback statico; prompt storico [`PROMPT_CHAT_E4_CITIES_SUPABASE.md`](PROMPT_CHAT_E4_CITIES_SUPABASE.md)); **board** `candidates` (`admin_workflow jsonb` + `kanban_rank numeric` migrazione `0150`, repository condiviso multi-browser con writeback ottimistico, evento `admin:candidates:board-updated` mantenuto come signal post-writeback; mock `mockCandidates.CANDIDATES` solo come fixture/test, fuori dal percorso online; **nota:** `mockCandidates.ts` resta in bundle per **tipi** `Candidate` e cataloghi UI **`DISCARD_REASON_*`**; prompt storico [`PROMPT_CHAT_E4_BOARD_CANDIDATES_SUPABASE.md`](PROMPT_CHAT_E4_BOARD_CANDIDATES_SUPABASE.md)). **2026-05-02 — Camerieri / `staff`:** [`staff-repository.ts`](../admin/src/components/camerieri/staff-repository.ts), `useCamerieri` da DB, migrazione locale one-shot, `staff-promotion.ts` + dopo promozione OK **archivio** candidato; evento **`admin:camerieri-staff:list-invalidate`**. Dettaglio e roadmap evolutiva promozione vs delete candidato: [`PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md`](PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md). **Campagne (`public.campaigns`):** liste + persistenza da **`CampagnePage`** / repository (`20260501000160` preview bucket); KPI card restano vuote senza aggregate su **`analytics_events`**. **Backlog ingest:** **`first_data_at` / `last_data_at`** valorizzati solo quando esiste ingestion server-side sugli eventi con `campaign_id` — vedere **`DEVELOPMENT_NOTES.md`** § *Campagne first_data_at / last_data_at* · [`PROMPT_CHAT_E4_CAMPAIGNS_SUPABASE.md`](PROMPT_CHAT_E4_CAMPAIGNS_SUPABASE.md) Step 5.

- [x] **E5 — Pagina Auth + guard** (2026-05-01)  
  Login Supabase Auth funzionante; env Vite (`admin/.env` / `.env.local`, non `.env.example`). Route protette nel gestionale.

---

## Gate pre-lancio — cosa è bloccante

Sintesi dai TODO in [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) (careers receiver, § «TODO pre-lancio effettivo»). Smoke Camerieri / `staff` conviene ancora prima del go-live ma non è elencato come gate separato. **Bloccante** = rischio perdita dati, UX rotta in prod, o superficie admin esposta senza protezione.

### Bloccanti tipici prima di produzione «vera»

- [x] **L1 — Receiver candidature (`VITE_CAREER_ENDPOINT`)** (2026-05-01)  
  Supabase Edge Function `career-submissions` con service role: riceve JSON o multipart dal form web, valida server-side, risolve `officeCitySlug` su `cities.is_active`, carica foto/CV nei bucket privati `careers-photos` / `careers-cv`, risolve `campaign_id` da `cid` tramite bridge RPC e inserisce `candidates` con attribution UTM e guardrail equivalenti alla policy anon (`pipeline_stage = 'nuovo'`, discard null, privacy true). Deploy/env documentati in `supabase/README.md`; `web/.env.example` punta al formato function URL + `VITE_CAREER_SUBMIT_FORMAT=multipart`.

- [x] **L2 — Form contatti (`VITE_CONTACT_ENDPOINT`) + inbox admin** (2026-05-01)  
  Edge Function `contact-submissions`: `POST` JSON da `web/components/contact-form.tsx`, validazione server-side, `source` / `status` forzati (`web_contact_form`, `nuovo`), insert `public.contact_messages`. Inbox **`admin/src/components/contact-messages/*`**: lettura condivisa Supabase, UPDATE stato, loading/error, badge sidebar. Deploy/env: **`CONTACT_ALLOWED_ORIGINS`**, **`SUPABASE_SERVICE_ROLE_KEY`**, deploy function; `VITE_CONTACT_ENDPOINT` → URL function (`supabase/README.md`). Prompt storico: [`PROMPT_CHAT_L2_CONTACT_RECEIVER.md`](PROMPT_CHAT_L2_CONTACT_RECEIVER.md).

- [x] **L3 — Strategia contenuti sito pubblico** (2026-05-07)  
  Chiuso come **A — Static-first** per il primo go-live: runtime `web` alimentato da contenuti consolidati in build (`siteContent`), senza fetch runtime verso `cms_sections` nel path principale.  
  Runbook operativo (aggiornamento contenuti, build/deploy, smoke minimo) documentato in [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) § *L3 static-first runbook (go-live)*.  
  **Backlog post go-live:** `CMS wiring production-safe` + `Web runtime da DB` restano fuori gate L3.

- [x] **L4 — Sicurezza gestionale** (2026-05-01)  
  Auth + guard sulle route admin operative insieme a **E5**; resta da confermare hardening deploy (HTTPS-only cookies, URL gestionale non indicizzato, ecc.) in checklist pre-prod.

- [x] **L5 — Persistenza pipeline candidati condivisa** (2026-05-01)  
  Board e stato candidati su `public.candidates` con migrazione `20260501000150_e4_candidates_admin_workflow.sql` (`admin_workflow jsonb` + `kanban_rank numeric`, indice `(city_id, pipeline_stage, kanban_rank)`). Hook `useCandidateBoardState` carica via repository, scrive via writeback ottimistico diff-based, mantiene evento `admin:candidates:board-updated` per badge sidebar; receiver L1 calcola `kanban_rank` append-tail sulla colonna `nuovo`. Test board riadattati con `InMemoryCandidatesRepository`.

### Di solito non bloccanti per un primo rilascio / demo

- **C4** — flush/export analytics (buffer già presente; utile ma non impedisce il sito).
- **A5** — dashboard KPI raffinati (A4 chiuso).
- Smoke test manuali residuali (eventuale policy **delete** candidato post-promozione), refactor frammentazione (`CandidatiBoard`, `careers-form`, …) — qualità/tech debt, non prerequisito minimo funzionale. **Crea Cameriere** + **toggle stato** CRM: vedi [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) § Camerieri, [`SMOKE_TEST_ADMIN.md`](SMOKE_TEST_ADMIN.md) § E.

---

## Legenda aggiornamenti

Quando completi una voce, imposta `- [x]` e opzionalmente aggiungi una riga data o riferimento PR sotto la voce.

Ultimo aggiornamento checklist (2026-05-07): completato **B3 Site Mode Switch** (`site_mode`, admin Config, gate runtime web; migrazione applicata al DB remoto, build web/admin verdi; resta smoke manuale dei 3 stati). Verificati **`supabase db push`** remoto allineato prima di B3 (include storage **`00170`**) e **smoke Camerieri end-to-end** superato (vedi [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) § Camerieri). **Stato finale L3:** chiuso come **L3 decision + runbook static-first**; micro-attivita residue solo backlog gia dichiarato (**CMS wiring production-safe**, **Web runtime da DB**), fuori scope primo go-live. Aggiornamento precedente (2026-05-03): **E4 · campagne** — persistenza liste + builder + storage preview; ingest **`first_data_at` / `last_data_at`** documentato come backlog (non admin). **Pausa:** [`PROMPT_CHAT_E4_CAMPAIGNS_SUPABASE.md`](PROMPT_CHAT_E4_CAMPAIGNS_SUPABASE.md) **Step 6** (KPI card / aggregati **`analytics_events`**) rinviato a ripresa progetto utente (preferenza sessione con modello più contesto quando i dati ingest saranno pronti). Precedenza (2026-05-02): **Camerieri / `staff`**. Prima (2026-05-01): **`cities`** + board **`candidates`** (**`L5`**), messaggi, **L1**, **L2**, **E2**, **E5**, **L4**. **Focus successivi suggeriti (post-pausa campagne KPI):** ingest analytics → **`analytics_events`** + timeline campagne; bucket media CMS (**E3**); **A5**; CRM staff come da [`PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md`](PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md).
