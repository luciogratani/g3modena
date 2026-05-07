# Admin Development Notes

## Scope

Stato sintetico di `admin` in fase pre-lancio demo, con focus su:
- board candidature;
- CMS editor + SEO + contatti;
- decisioni architetturali in vista di DB/Auth.

Piano dati condiviso con `web` (schema Supabase previsto, sequenza pre-wiring): [`DB_CMS_INTEGRATION.md`](DB_CMS_INTEGRATION.md) — sezione **Parte Admin**.

Concept pre-coding (campagne, analytics, città + form, RLS): [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md).

Roadmap checkbox pre-wiring: [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md).

**Smoke test manuale admin (repeatable):** [`SMOKE_TEST_ADMIN.md`](SMOKE_TEST_ADMIN.md).

---

## Web pubblico — Form candidature (`careers`)

- [x] Step dedicato **sede di candidatura** (step 1 di 5): scelta da **`public.cities`** via REST anon (`is_active = true`, ordinamento `sort_order`); fallback statico `modena`/`sassari` solo se env/fetch Supabase non disponibili.
- [x] Campo **`officeCitySlug`** nel payload (**JSON** e **multipart**) da `buildCareerJsonPayload` / `buildCareerMultipartPayload`; **`city`** = residenza/domicilio (step anagrafici).
- [x] **B2 UTM + `cid`**: query string (`cid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`) catturata da `web/lib/campaign-attribution.ts`, persistita in `sessionStorage` (`web:campaign-attribution:v1`) e propagata al submit candidature.
- [x] **C1 analytics locale (pre-Supabase)**: `web/lib/analytics.ts` — session id `web:analytics:session-id:v1`, funnel attempt careers `web:analytics:careers:funnel-attempt-id:v1`, buffer `web:analytics:buffer:v1`, union eventi come da [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md); ogni record porta UTM + **`cid`** dall’attribution; `page_view` in `App.tsx` dopo capture attribution; sul form: `careers_form_open`, `careers_step_view`, `careers_submit` (post-successo, `citySlug` da `officeCitySlug`).
- [x] **C2 inventario `cta_key`**: modulo condiviso `web/lib/analytics-cta-keys.ts` con union `CtaKey` allineata al concept (`nav_logo_home` ... `footer_mail_mediterraneo`), helper `trackCtaClick(ctaKey)` in `web/lib/analytics.ts` e wiring `cta_click` in `web/components/navbar.tsx`, `web/components/hero.tsx`, `web/components/footer.tsx` (esclusi submit contatti e pulsanti wizard careers).
- [x] **C3 `careers_abandon`**: listener best-effort `visibilitychange` (`hidden`) + `pagehide` in `careers-form.tsx`, con dedup max 1 evento per attempt via chiavi sessione `web:analytics:careers:abandon-sent:v1:{attemptId}` e guard submit `web:analytics:careers:submit-sent:v1:{attemptId}`.
- [x] **C4 ingest adapter (pre-Supabase)**: `web/lib/analytics-ingest.ts` avvia flush automatico solo se presente `VITE_ANALYTICS_INGEST_URL`; il buffer locale `web:analytics:buffer:v1` resta sempre source of truth (append offline-first), poi invio batch JSON in snake_case (`events[]`) con retry silenzioso su errore. Trigger flush: debounce/idle su nuovi eventi, intervallo leggero (15s), lifecycle `visibilitychange` (`hidden`) e `pagehide`; su `200 OK` rimozione dal buffer dei soli eventi accettati (se `accepted_event_ids` o `accepted_count`, altrimenti batch intero). In dev disponibile mock locale (`pnpm --filter web dev:analytics-mock`, endpoint `http://localhost:8788/ingest`) per test end-to-end senza Supabase. Contratto request/response: [`ANALYTICS_INGEST_CONTRACT.md`](ANALYTICS_INGEST_CONTRACT.md).
- [x] Receiver **`VITE_CAREER_ENDPOINT`** (gate **L1**, 2026-05-01): Edge Function `supabase/functions/career-submissions/index.ts` — persistenza **`officeCitySlug`** tramite lookup **`public.cities`** (`is_active`), attribution **UTM + `cid`** + **`campaign_id`** da RPC `resolve_campaign_id_from_cid`; bucket privati **`careers-photos`** / **`careers-cv`** (`20260501000140_e3_storage_careers.sql`). Deploy/env/smoke: `supabase/README.md`; formato env web: `web/.env.example` (`VITE_CAREER_SUBMIT_FORMAT=multipart`).

---

## Stato attuale (pre-lancio)

### Dashboard / Shell
- [x] Dashboard demo coerente (`Messaggi+candidature`, `Fonte traffico`, `Traffico ultimi 3 mesi`, `Pipeline per citta`).
- [x] Microcopy client-facing ripulita (rimosso linguaggio troppo tecnico).
- [x] Sidebar ripulita (`Showcase` rimosso, sezione candidati semplificata, badge collegati ai dati).
- [x] Pagina `Impostazioni` reale con tema `light|dark|auto` + persistenza + migrazione chiave legacy.
- [x] Pagina **Marketing › Campagne** (`CampagnePage`): lista da **`public.campaigns`**, storage **`campaign-previews`**, salvataggio builder con validazione contratto; KPI card ancora a zero senza query su **`analytics_events`**. **`first_data_at` / `last_data_at`:** solo dalla futura pipeline ingest (policy in § *Decisioni tecniche*). **Ripresa lavori:** KPI live + aggregati (**prompt Campagne Step 6**) in pausa fino a decisione progetto utente / modello più adatto e dati ingest; contratto [`CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md); orchestrazione [`PROMPT_CHAT_E4_CAMPAIGNS_SUPABASE.md`](PROMPT_CHAT_E4_CAMPAIGNS_SUPABASE.md).

### Board candidature
- [x] Board **parametrizzata per `citySlug` stringa** (città da config `listActiveCities`), senza union rigida solo Modena/Sassari; filtri colonna `Nuovo` e stato board aggiornati di conseguenza (`board-utils`, `useCandidateBoardState`, `useNewColumnFilters`, `KanbanColumn`).
- [x] DnD stabile con `@dnd-kit` (riordino intra-colonna + movimenti inter-colonna).
- [x] Workflow assistito con dialog su transizioni (`colloquio`, `formazione`, `in_attesa`, `scartati`).
- [x] Quinta colonna **Scartati** con motivazione strutturata (`DiscardReasonKey` v1: `not_a_fit`, `no_show`, `declined_by_candidate`, `unreachable`, `duplicate`, `failed_interview`, `failed_training`, `other`) e nota libera (max 500 char, obbligatoria su `other`); ripristino verso `discardReturnStatus` (fallback `nuovo`) da context menu e `CandidateDetailSheet`. Cleanup metadata simmetrico al `postpone` (vedi *Discard policy*).
- [x] `CandidateDetailSheet` evoluto (editing inline workflow, note, sezioni collassabili, quick actions).
- [x] Recap operativo iniziale + reminder rimandati (`Scaduti`, `Oggi`, `Prossimi 7gg`).
- [x] Formazione con sub-lane `Teoria`/`Pratica` e gestione fase attiva singola.
- [x] Filtri colonna `Nuovo` (eta slider, visibilita personalizzabile, persistenza per citta, reset su hide).
- [x] Refactor board completato in hook/moduli dedicati:
  - `useNewColumnFilters`
  - `useBoardRecap`
  - `workflow-utils`
  - `useBoardWorkflowDialogs`
  - `useBoardWorkflowDetails`
- [x] Test regressione board attivi con Vitest:
  - `pnpm test:board`
  - copertura su `board-utils` (transitions pure + kanban rank), `workflow-utils`, `useCandidateBoardState` (con `InMemoryCandidatesRepository` iniettato), `candidates-repository` (mapping snake/camel + flatten `admin_workflow`), `useNewColumnFilters`.
- [x] **Persistenza condivisa Supabase (E4/L5, 2026-05-01)**: hook `useCandidateBoardState` carica via `candidates-repository.listByCity(slug)` (lookup `cities` per slug -> id, ORDER BY `(pipeline_stage, kanban_rank)`); writeback ottimistico diff-based emette UPDATE per pipeline/discard/admin_workflow/rank o DELETE quando il candidato esce dal board (`handleClearArchived`). DnD intra-colonna usa `kanban_rank` con strategia midpoint float (un solo UPDATE per drop). Receiver L1 `career-submissions` calcola `kanban_rank = max + 1000` sulla colonna `nuovo` della sede.

### CMS / SEO / Contatti
- [x] CMS editor guidato completo su sezioni `hero/about/clients/why_g3/footer/sections` (no JSON editing per utente finale).
- [x] Confirm su reload con dirty state + save disabilitato se nessuna modifica.
- [x] Web Editor lazy-loaded con fallback uniforme (`PageLoadingFallback`).
- [x] SEO page reale in admin con salvataggio manuale e validazioni base.
- [x] Contratto condiviso `@g3/content-contract` adottato tra admin e web.
- [x] `Contatti > Messaggi`: inbox su **`contact_messages`** (Supabase autenticato), submit web via Edge **`contact-submissions`** (`VITE_CONTACT_ENDPOINT`); loading/error e badge sidebar; gate **L2** (2026-05-01).

### Diagnostica Supabase
- [x] Card `Monitor Supabase` in `Impostazioni` con check mount + retry.
- [x] Stati e telemetria base (`Online/Offline/Config mancante/In corso`, latenza, ultimo controllo).

### Sedi / cities (Supabase, E4)
- [x] Pagina **Config › Sedi** (`CitiesPage`) integrata in `admin/src/App.tsx`.
- [x] Modello `OfficeCity` (`City` alias): `id`, `slug`, `displayName`, `isActive`, `sortOrder` — `admin/src/components/cities/types.ts`.
- [x] Adapter `admin/src/components/cities/storage.ts` su **`public.cities`** via client Supabase autenticato: mapping DB (`display_name`, `is_active`, `sort_order`) ↔ UI (`displayName`, `isActive`, `sortOrder`), CRUD, `moveCity`, `deleteCity`, helper `isCityDeleteLocked` / `canDeleteCity`.
- [x] Evento UI **`admin:cities:updated`** mantenuto per aggiornare sidebar/badge dopo mutazioni; il vecchio `admin:cities:v1` non viene importato automaticamente. DB vuoto = nessuna sede finché non viene creato/seedato.
- [x] UX: slug univoca via vincolo DB; conferma su cambio slug in modifica; attiva/disattiva; ordinamento su/giù; loading/empty/error state.
- **Limite attuale:** eliminazione **non consentita** in UI per sedi legacy con slug `modena` e `sassari`; per altre sedi eventuali FK DB restituiscono messaggio “disattivala invece di eliminarla”.

### Sidebar Candidati / Camerieri (dinamica da cities, Step A3)

- [x] **`App.tsx`**: import `listActiveCities`, `CITIES_UPDATED_EVENT`; stato `activeCities` + `useMemo` slug ordinati; listener finestra su **`admin:cities:updated`** per aggiornare città e conteggi “Nuovo”.
- [x] **Candidati:** voci sidebar generate da città **attive** (nessun hardcode Modena/Sassari); titolo header `Candidati › {label da slug} › Board`.
- [x] **Badge “Nuovo”:** `getNewCandidatesByCityCounts(activeCitySlugs)` — mappa `Record<string, number>` per slug presenti nelle sedi attive.
- [x] **Routing pagina:** tipo somma `Page` = static \| `{ kind: candidates, citySlug }` \| `{ kind: waiters, citySlug }`.
- [x] **Board:** parametrizzazione per **`citySlug: string`** (`CandidatiBoard`, `useCandidateBoardState`, `useNewColumnFilters`, `board-utils`, `KanbanColumn`). Etichetta città in card: `getCandidateCityLabel()` in `candidate-utils.ts` (slug generico → label leggibile).
- [x] **Camerieri:** voci sidebar da **`activeCities`** (`listActiveCities`), come Candidati; etichette `displayName` o fallback slug; redirect dashboard se slug non più tra le sedi attive.

### Camerieri CRM su `public.staff` (E4, 2026-05-02; agg. creazione CRM + toggle stato 2026-05-03; foto CRM dopo migrazione **00170**)

- [x] **Sorgente dati:** `admin/src/components/camerieri/staff-repository.ts` — `listByCitySlug`, `upsertStaff` (idempotenza `source_candidate_id`), **`updateStaffActive`** (solo `is_active`, filtrato per `city_id` della sede corrente), mapping ↔ `Cameriere`, lookup `city_id` via `loadCities()`; **`avatar_path`** — promozione board → bucket **`careers-photos`**; creazione/editing CRM dal dialog (**`uploadStaffCrmAvatar`**) → bucket privato **`staff-crm-avatars`** con prefisso path fisso **`crm-staff/`**; **`staffApplyAvatarSignedUrls`** usa il bucket corretto in base al prefisso (signed URL tabella lista).
- [x] **UI lettura:** `useCamerieri` (loading/error/reload), evento **`admin:camerieri-staff:list-invalidate`**, listener anche su `admin:cities:updated`, focus, storage.
- [x] **UI scrittura CRM:** badge colonna **Stato** in `CamerieriTable` come **pulsante** (stessa resa visiva del badge) → `updateStaffActive` + `dispatchStaffListInvalidated`; errori utente con **sonner** `toast.error` (Toaster in `admin/src/main.tsx`).
- [x] **Migrazione legacy:** `migrate-local-camerieri-to-staff.ts` + primo run dopo login in `App.tsx`; marker **`admin:camerieri:v1-local-drained-at`**; chiave storica **`admin:camerieri:crm:v1`** solo per import one-shot (JSDoc nel file).
- [x] **Promozione:** `staff-promotion.ts` (`upsertStaff` + mapper con `profilePhotoStoragePath`). Dopo promozione **riuscita**, `useCandidateBoardState` archivia il candidato (stesso percorso del menu «Archivia» → sync `pipeline_stage`).
- [x] **Tipi:** `Cameriere.city` = **`CandidateCitySlug`** (sedie dinamiche).
- [x] **`CreateCameriereDialog`:** form completo (nome/cognome, email/telefono, tag, attivo) + **foto profilo opzionale** (`URL.createObjectURL` / revoke in cleanup); submit → **`upsertStaff`** senza `sourceCandidateId`; con file allegato **`uploadStaffCrmAvatar`** prima, poi **`upsertStaff`** con `avatarUrl` = path **`crm-staff/…`**; toast **sonner** (successo / errore upload) + invalidazione lista. Prompt dialog: [`PROMPT_CHAT_E4_STAFF_CREATE_CAMERIERE_DIALOG.md`](PROMPT_CHAT_E4_STAFF_CREATE_CAMERIERE_DIALOG.md); storage CRM: [`PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md`](PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md).

#### Moduli (`admin/src/components/camerieri/`)

`types.ts`, `mappers.ts`, `staff-repository.ts`, `staff-events.ts`, `staff-promotion.ts`, `migrate-local-camerieri-to-staff.ts`, `useCamerieri.ts`, `CamerieriPage.tsx`, `CamerieriCrmPanel.tsx`, `CamerieriTable.tsx`, `CreateCameriereDialog.tsx`. Rimosso **`storage.ts`**. Integrazioni: `App.tsx`, `useCandidateBoardState`.

#### Evoluzioni candidate (promozione) da valutare

- **A — Archivio con nota:** es. «Promozione a staff in data …» (`admin_workflow`, nota, o colonne dedicate).
- **B — Promozione + delete:** rimuovere / `DELETE` `candidates` se la storia deve vivere solo su `staff`.

[`PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md`](PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md).

#### Smoke manuale (Camerieri) — eseguito E2E il 2026-05-07

- [x] Prerequisito ambiente remoti: dopo `supabase db push`, migrazione applicata **`20260501000170`** (`staff-crm-avatars`) così upload foto CRM non fallisce — vedi [`supabase/README.md`](../supabase/README.md) § Storage `staff-crm-avatars`.
- [x] Camerieri: almeno **due** sedi attive in sidebar.
- [x] Tabella CRM vs Supabase **`staff`**; ricerca e filtri.
- [x] **Crea Cameriere:** dialog valido → riga `staff` con `source_candidate_id` **null**; lista si aggiorna senza F5.
- [x] **Crea Cameriere con foto:** stesso flow con immagine JPG/PNG/WebP ≤ 5 MB → **`avatar_path`** in DB inizia con **`crm-staff/`**, file nel bucket **`staff-crm-avatars`** (Dashboard Storage); dopo **F5** o invalidazione lista, anteprima avatar in tabella tramite signed URL coerente.
- [x] **Badge Stato:** click attiva/disattiva → colonna `is_active` in DB e filtri lista coerenti.
- [x] `Promuovi a Cameriere`: riga `staff` + candidato in **Archivio** dopo reload.

#### Rimandato

Test Vitest validazione camerieri estratta (prompt dialog step 5 opzionale), scelta A vs B sopra.

---

## Decisioni tecniche vive

- **Board status policy**: lo stato runtime deriva sempre dalla colonna corrente.
- **Date policy**: evitare `new Date(...)` inline nei render; usare helper centralizzati e fallback.
- **Board persistence policy** (2026-05-01, gate **L5**): sorgente condivisa su `public.candidates` via Supabase autenticato (`admin/src/components/candidati-board/candidates-repository.ts`). Niente blob locale. Ordinamento intra-colonna via `kanban_rank numeric` con strategia midpoint float (`(prev + next) / 2`); workflow UI non normalizzato in `admin_workflow jsonb`. Writeback ottimistico diff-based dentro `useCandidateBoardState`: ogni mutation aggiorna lo state e in parallelo emette UPDATE/DELETE; gli errori di sync compaiono come banner sopra la board. Evento `admin:candidates:board-updated` mantenuto come signal UI post-writeback per badge sidebar e count "Nuovo".
- **Filters policy**: filtri `Nuovo` persistenti per citta; filtro nascosto => filtro disattivato/reset.
- **Discard policy**: `scartati` è stato strutturato (catalogo ragioni v1 chiuso + nota opzionale). Il move avviene solo dopo conferma del dialog (parità con `colloquio`/`postpone`). Uscire dalla colonna (`Ripristina`, archivio, drop su altra colonna) ripulisce automaticamente `discardReasonKey|Note|At|ReturnStatus` via `clearDiscardMetadataIfNeeded`. `Promuovi a Cameriere` non è esposto in `scartati`; se la promozione su `staff` riesce, il candidato viene **archiviato** automaticamente (stesso path del menu «Archivia»).
- **Contract policy**: nuove key CMS prima in `@g3/content-contract`, poi propagate ad admin/web.
- **Auth policy** (2026-05-01, **E5** / **L4** baseline): senza Supabase configurato (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) o senza sessione valida resta **`AdminLoginPage`**; dati operativi dietro RLS **`authenticated`** (`admin/src/App.tsx`). Residuo: hardening deploy (HTTPS, cookie, URL non indicizzato) checklist pre-prod.
- **Campagne status policy**: usare `first_data_at` (primo `page_view` con `cid`) e `last_data_at` (ultimo evento attribuito) come uniche fonti canoniche.
- **Campagne query policy**: derivare `No dati|Attiva|Disattiva` a runtime (finestra 5 giorni) senza persistere `status` in colonna nella v1.
- **Campagne `first_data_at` / `last_data_at` (Step E4 / backlog ingest, non admin):**
  - In **INSERT** da Marketing › Campagna restano **NULL** — comportamento corretto.
  - **Non** aggiornarli dall’admin (niente shortcut SQL di prova nella UI né “fake analytics”).
  - Quando gli eventi finiscono in **`public.analytics_events`** con `campaign_id`/attribuzione `cid` stabile server-side (ingest dopo **C4** → Storage su Supabase): introdurre un solo percorso canale (meglio **post-insert evento** sicuro alle policy, alternativa aggregazione periodica documentata).
  - Regole prodotti (`CAMPAIGNS_CONTRACT.md` §4): `first_data_at` si imposta quando è ancora **NULL** usando il timestamp dell’evento (primo segnale); su ogni evento attribuito aggiornare **`last_data_at`** (finestra attività/stato ciclo §2). Mantenere il CHECK `last_data_at >= first_data_at` nella stessa **transazione** (o RPC `SECURITY DEFINER`).
  - Fino ad allora tutte le card marketing restano **`No dati`** su stato ciclo salvo compilazione artificiosa in SQL (solo troubleshooting, non prod).
- **Campagne identity policy**: `campaigns.id` (uuid) è l’ID interno canonico; `cid` resta token corto pubblico per link tracking.
- **Cities legacy policy**: gli slug `modena` / `sassari` non sono eliminabili da UI (**Config › Sedi**, regole dedicate); disattivazione consentita. **Camerieri** seguono tutte le sedi **attive** (`listActiveCities`); i dati sono su **`public.staff`** (`city_id` FK), senza dipendenza da localStorage legacy.
- **Staff / promozione policy (2026-05-02):** promozione = scrittura `staff` + archivio `candidates` al successo. Valutazioni future: nota strutturata in archivio (*Promozione in data …*) vs **DELETE** candidato — vedi § Camerieri e [`PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md`](PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md).

---

## TODO pre-lancio effettivo (priorita)

- [x] **Decisione L3 (2026-05-07):** primo go-live in modalita **Static-first** (contenuti web da artifact build consolidato). Il runtime contenuti da DB resta backlog successivo.
- [x] **Board persistence server-side** (2026-05-01, **L5**): board candidati su `public.candidates` (admin Supabase autenticato), `admin_workflow jsonb` + `kanban_rank numeric`, repository condiviso multi-browser, mock `CANDIDATES` solo come test fixture.
- [x] **Contatti > Messaggi backend wiring**: Edge `contact-submissions` + inbox admin Supabase (`contact_messages`), stato `nuovo/letto/archiviato` persistito.
- [ ] **CMS wiring production-safe**: verifica schema, RLS/policy, tenant separation, fallback robusto.
- [ ] **Web runtime da DB**: lettura reale contenuti da Supabase con fallback/feature-flag.
- [x] **Auth/protezione admin**: login Supabase + guard route (**E5**/ **L4**, 2026-05-01); hardening deploy pre-prod da confermare.

---

## Inventario migrazione DB (pre-wiring)

Questa sezione fotografa le sorgenti locali che dovranno essere considerate quando si passa a Supabase. Il modello dati completo resta descritto in `docs/DB_CMS_INTEGRATION.md` e nel concept pre-wiring.

### Decisioni schema da rispettare

- **Città:** usare `cities.id` come FK (`city_id`) sulle tabelle operative; `cities.slug` sostituisce il concetto legacy `city_code` (`modena`, `sassari`) per URL, seed, export e mapping da dati locali.
- **Candidati:** tabella `candidates` con mapping dal form web e stato workflow admin (`pipeline_stage` set v1 = `nuovo|colloquio|formazione|in_attesa|scartati|rimandati|archivio`). Colonne discard strutturate: `discard_reason_key` (whitelist v1 + `other`), `discard_reason_note` (max 500 char, obbligatoria app-side se `other`), `discarded_at`, `discard_return_status`. Allegati v1 come path diretti (`profile_photo_path`, `cv_path`), senza tabella attachment dedicata.
- **Staff:** tabella DB `staff`; la UI può continuare a chiamare il dominio “Camerieri”. Collegamento opzionale a candidato con `source_candidate_id`.
- **CMS:** tabella `cms_sections` con `section_key`; `seo` è una riga speciale nella stessa tabella, non una tabella separata in v1.
- **Contatti:** tabella `contact_messages` separata da analytics, con stato `nuovo|letto|archiviato`.

### localStorage e segnali da migrare o preservare

| Dominio | Chiave / evento | Destinazione prevista |
|--------|------------------|-----------------------|
| Board candidati | ~~`admin:candidates:board:v1`~~ (legacy, rimosso 2026-05-01) | `candidates` (`pipeline_stage` + `kanban_rank` + `admin_workflow jsonb`, gate **L5** ✓) |
| Filtri colonna `Nuovo` | `admin:candidates:new-column-filters:state:v1:{slug-sede}` (es. `:modena`, una chiave per `boardCity`) | Restano preferenze locali salvo richiesta sync |
| Visibilità filtri `Nuovo` | `admin:candidates:new-column-filters:visibility:v1:{slug-sede}` | Restano preferenze locali |
| Recap giornaliero | `admin:candidates:daily-recap:dismissed-on` | Preferenza locale, non DB v1 |
| Messaggi contatti | ~~`admin:contact-messages:v1`~~ (legacy); lista ora da **`contact_messages`** | `contact_messages` (L2 ✓) |
| Camerieri CRM | ~~`admin:camerieri:crm:v1`~~ migrato one-shot → **`public.staff`**; evento UI staff `admin:camerieri-staff:list-invalidate` | `staff` ✓ |
| Sedi | ~~`admin:cities:v1`~~ (legacy); dati da **`public.cities`**; evento **`admin:cities:updated`** solo segnale UI post-mutazione | `cities` (E4 ✓) |
| Board update | evento `admin:candidates:board-updated` | Mantenuto come signal UI post-writeback DB (sidebar badge + count "Nuovo") |
| Tema admin | `admin-theme-preference` (`admin-theme` legacy) | Resta localStorage |

### Env Supabase admin già usate dal codice

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_CMS_TABLE` (default `cms_sections`)
- `VITE_TENANT_SCHEMA` (opzionale)
- `VITE_SUPABASE_MEDIA_BUCKET` (default `site-media`)

---

## Schema v1 — decisioni (D1 + E1)

Stato 2026-05-01: completati **audit ERD (D1)** e **migrazioni SQL v1 (E1)** in `supabase/migrations/`.

- **Vincolo no-mock confermato:** migrazioni **schema-only**; nessun `INSERT` di dati demo/business.
- **Tabelle create v1:** `cities`, `campaigns`, `candidates` (alter `0080` per A4 *Scartati*), `staff`, `cms_sections`, `contact_messages`, `analytics_events`.
- **Helper condiviso:** `pgcrypto` + trigger function `set_updated_at_timestamp()` (solo utilità tecnica).
- **Scelte principali allineate ai contratti:**
  - `campaigns`: `cid` unique, stato derivato runtime (`first_data_at`/`last_data_at`), niente `status` persistito;
  - `candidates.languages`: `text[]` (payload web a lista);
  - `analytics_events`: append-only con `client_event_id` (idempotenza ingest) e `received_at`;
  - `cms_sections`: unique composito tenant+sezione (`NULLS NOT DISTINCT`, Postgres 15+);
  - `contact_messages`: `updated_at` + workflow `nuovo|letto|archiviato`;
  - `candidates` (A4 / migrazione `0080`): `pipeline_stage` esteso con `scartati`; nuove colonne `discard_reason_key|note|discarded_at|return_status` con CHECK whitelistati e indice parziale `candidates_discard_reason_idx where discard_reason_key is not null`.
  - `candidates` (E4/L5 / migrazione `0150`): `admin_workflow jsonb` (snapshot UI workflow non normalizzato, no CHECK in v1) + `kanban_rank numeric` scoped per `(city_id, pipeline_stage)` (strategia midpoint float, indice composito `candidates_city_stage_rank_idx`).
- **Perimetro residuo:** E3 (Storage **CMS**/media senza baseline); **E4** — campagne ora su DB (**liste + persist**); restano KPI card campagne (**Step 6** prompt) dopo populate **`analytics_events`**, ingest timeline **`first_data_at`/`last_data_at`** (§ sopra); L3 come da roadmap.

Riferimenti: `supabase/README.md`, `docs/CAMPAIGNS_CONTRACT.md`, `docs/ANALYTICS_INGEST_CONTRACT.md`, `docs/DB_CMS_INTEGRATION.md`.

---

## TODO post-lancio / evolutivi

- [ ] **Campagne › KPI card (prompt E4 Step 6):** query aggregate **`analytics_events`** / candidati per `campaign_id` come da [`CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md) §5 — in pausa (vedi [`PROMPT_CHAT_E4_CAMPAIGNS_SUPABASE.md`](PROMPT_CHAT_E4_CAMPAIGNS_SUPABASE.md)).
- [ ] Publish flow CMS (`draft/published`, `updated_at`, versioning).
- [ ] Storage media strutturato (bucket/policy/metadata completi).
- [ ] Estensione lazy-load ad altre pagine pesanti (`Board`, `SEO`, `Settings`).
- [ ] Supabase monitor avanzato (probe DB/RLS specifici + storico verifiche).

## Refactor candidati (prima della task grossa)

Componenti da frammentare prima del prossimo blocco di sviluppo:

- [ ] `admin/src/components/CandidatiBoard.tsx`  
  Estrarre orchestrazione UI/DnD/dialog in componenti dedicati (`BoardDialogs`, `BoardColumnsGrid`, `BoardDndLayer`).
- [ ] `admin/src/components/candidati-board/CandidateDetailSheet.tsx`  
  Estrarre sezioni principali (`ProfileSummarySection`, `WorkflowSection`, `NotesSection`, date picker inline).
- [ ] `admin/src/components/CmsWebEditor.tsx`  
  Separare stato/persistenza/toolbar da rendering sezioni (`useCmsSectionsState`, `useCmsPersistence`, `CmsEditorToolbar`).
- [ ] `web/components/careers-form.tsx`  
  Frammentare in hook + step UI (`useCareersFormState`, `useCareersFormValidation`, `useCareersFormSubmit`, `Step1..Step4`).

Priorita consigliata: `CandidatiBoard` -> `CandidateDetailSheet` -> `CmsWebEditor` -> `careers-form`.

---

## Log operativo (2026-05-01, sera)

- Eseguito `supabase db push` sul progetto remoto con apply completato di:
  - `20260501000140_e3_storage_careers.sql`
  - `20260501000150_e4_candidates_admin_workflow.sql`
- Deploy remoto completato delle Edge Functions:
  - `career-submissions`
  - `contact-submissions`
- CORS temporaneamente aperto in test: `CAREERS_ALLOWED_ORIGINS` e `CONTACT_ALLOWED_ORIGINS` non risultano impostati (match wildcard runtime). Da restringere con whitelist esplicita prima del go-live pubblico.
- Ambiente locale web riallineato: creato `web/.env` con endpoint function Supabase (`career-submissions`, `contact-submissions`) + `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Fix gateway Functions **401**: il browser deve inviare `Authorization: Bearer <anon>` + `apikey` (`web/lib/supabase-edge-invoke-headers.ts` usato da careers e contact).

### Aggiornamento admin — Camerieri / staff (2026-05-02)

- Wiring **`public.staff`**: repository, sidebar su tutte le sedi attive, migrazione localStorage legacy, promozione con archivio automatico sul candidato al successo. Dettaglio: [`PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md`](PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md), [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) § E4, § Camerieri in questo file.

### Aggiornamento admin — Camerieri CRM scrittura (2026-05-03)

- **`CreateCameriereDialog`:** creazione manuale CRM (vedi [`PROMPT_CHAT_E4_STAFF_CREATE_CAMERIERE_DIALOG.md`](PROMPT_CHAT_E4_STAFF_CREATE_CAMERIERE_DIALOG.md)).
- **`updateStaffActive`** + badge **Stato** cliccabile in tabella; toast **sonner** (`admin/package.json`, `admin/src/main.tsx`).

### Aggiornamento admin — Foto profilo “Crea Cameriere” (Storage **00170**)

- Migrazione [`20260501000170_e3_storage_staff_crm_avatars.sql`](../supabase/migrations/20260501000170_e3_storage_staff_crm_avatars.sql): bucket **`staff-crm-avatars`** (privato), policy **`authenticated`** CRUD su `storage.objects` come **`campaign-previews`**.
- Repository: **`uploadStaffCrmAvatar`**, **`STAFF_CRM_AVATARS_BUCKET`**, **`STAFF_CRM_AVATAR_PATH_PREFIX`** (`crm-staff/`), routing signed URL in **`staffApplyAvatarSignedUrls`**. Dettaglio e post-deploy checklist: [`PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md`](PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md).

### Aggiornamento deploy (2026-05-02)

- **Vercel:** due progetti (**`web`** + **`admin`**) con env `VITE_*` allineate al minimo operativo; **senza** `VITE_ANALYTICS_INGEST_URL` finché non si attiva ingest remoto (resta solo buffer locale sul sito — vedi roadmap C4).
- **Supabase Functions:** già distribuite **`career-submissions`** e **`contact-submissions`** sul progetto collegato; verifica rapida → [`docs/PROMPT_CHAT_MAIN_LAUNCH_READINESS.md`](PROMPT_CHAT_MAIN_LAUNCH_READINESS.md) § *Contesto operativo* › *Verifiche Supabase rapide*.
- **`public.cities`:** populate in ambiente destinato al go-live con slug coerenti con form pubblico ed admin (**Config › Sedi**).

### Aggiornamento operativo (2026-05-07)

- Verificato `supabase db push`: database remoto allineato (`Remote database is up to date`), inclusa migrazione storage **`20260501000170`** già applicata.
- Eseguito smoke test **Camerieri end-to-end** con esito positivo (checklist § *Smoke manuale (Camerieri)* completata).

---

## Checklist rapida per nuove chat

1. Eseguire `pnpm build:admin`.
2. Eseguire `pnpm test:board`.
3. Se tocchi CMS: verificare allineamento con `@g3/content-contract`.
4. Se tocchi board: smoke test su DnD, dialog workflow, recap, filtri, persistenza.
5. Se tocchi Camerieri / `staff` o promozione: smoke su `pnpm build:admin`, lista CRM vs Supabase **`staff`**, **Crea Cameriere** (con e senza foto se **`00170`** è applicato), toggle **Stato** in tabella, promozione → archivio candidato (vedi § Camerieri e [`SMOKE_TEST_ADMIN.md`](SMOKE_TEST_ADMIN.md) § E).
6. Se introduci fetch remoto: passare sempre da adapter/normalizzazione con fallback.
