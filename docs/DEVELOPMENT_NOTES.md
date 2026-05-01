# Admin Development Notes

## Scope

Stato sintetico di `admin` in fase pre-lancio demo, con focus su:
- board candidature;
- CMS editor + SEO + contatti;
- decisioni architetturali in vista di DB/Auth.

Piano dati condiviso con `web` (schema Supabase previsto, sequenza pre-wiring): [`DB_CMS_INTEGRATION.md`](DB_CMS_INTEGRATION.md) — sezione **Parte Admin**.

Concept pre-coding (campagne, analytics, città + form, RLS): [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md).

Roadmap checkbox pre-wiring: [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md).

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
- [x] Pagina **Marketing › Campagne** (`CampagnePage`) MVP locale (builder UTM/`cid`, card demo); contratto operativo [`CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md).

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
  - copertura su `board-utils`, `workflow-utils`, `useCandidateBoardState`, `useNewColumnFilters`.

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
- [x] **Camerieri:** voci sidebar da `activeCities.filter` su **`SUPPORTED_WAITER_CITY_SLUGS`** (`modena`, `sassari`): CRM resta compatibile con bucket storage attuale; nuove sedi **non** compaiono in Camerieri finché lo storage staff non è esteso.

### Camerieri (MVP CRM locale)

Scope attuale:
- CRM camerieri per citta (`Modena` / `Sassari`), senza timeline disponibilita in admin.

#### Strategia di implementazione usata (safe order)
0. allineamento note + scope `now vs future`;
1. fondazioni dati (modello + storage locale versionato + idempotenza);
2. sidebar/routing per flusso end-to-end navigabile;
3. pagina CRM desktop (singolo pannello);
4. tabella con ricerca/filtro e CTA placeholder;
5. promozione da board candidati verso storage camerieri;
6. hardening con build/lint/test board.

#### Stato implementato ORA
- [x] Sidebar/routing Camerieri allineato alle **città attive** ma **solo** slug `modena` / `sassari` supportati dallo storage CRM (`SUPPORTED_WAITER_CITY_SLUGS` in `App.tsx`).
- [x] Pagina CRM desktop a pannello unico (`CamerieriPage`).
- [x] CRM operativo con colonne minime richieste:
  - avatar;
  - nome e cognome;
  - contatto (azioni rapide);
  - stato attivo;
  - tag sintetici (icone).
- [x] Ricerca base (nome/email/telefono/tag) + filtro stato (`all|active|inactive`).
- [x] CTA `Crea Cameriere` con dialog placeholder.
- [x] Modello dati dedicato `Cameriere` separato da `Candidato`.
- [x] Storage locale versionato dedicato:
  - key: `admin:camerieri:crm:v1`;
  - parser/sanitizer robusto con fallback safe;
  - bucket per citta `modena|sassari`.
  - eventuali chiavi legacy nel JSON (es. dati rimossi da vecchie prove) possono restare nel blob ma non sono lette dal modello corrente.
- [x] Promozione da board candidati (`Promuovi a Cameriere`) con idempotenza minima:
  - upsert su `sourceCandidateId`;
  - no duplicazioni evidenti anche su promozioni ripetute.

#### Struttura modulare introdotta
`admin/src/components/camerieri/`
- `types.ts`
- `storage.ts`
- `mappers.ts`
- `useCamerieri.ts`
- `CamerieriPage.tsx`
- `CamerieriCrmPanel.tsx`
- `CamerieriTable.tsx`
- `CreateCameriereDialog.tsx`

Integrazioni cross-modulo:
- `admin/src/App.tsx` (sidebar + routing);
- board candidati (`CandidateCard` / `KanbanColumn` / `CandidatiBoard` / `useCandidateBoardState`) per azione promozione.

#### Criteri di accettazione coperti
- [x] Sidebar Candidati: voci da `listActiveCities()` (ordine sedi); Camerieri: stesso ingresso ma filtrato ai due slug legacy finché lo storage è solo `modena|sassari`.
- [x] CRM operativo con Avatar + Nome/Cognome (e colonne CRM minime utili).
- [x] Bottone `Crea Cameriere` apre dialog placeholder.
- [x] Context menu candidati consente promozione con persistenza locale.

#### Smoke test manuale minimo (regressioni)
- [ ] Navigazione sidebar:
  - aprire `Camerieri > Modena` e `Camerieri > Sassari`, verificare pagina corretta.
- [ ] CRM:
  - verificare rendering tabella, ricerca e filtro stato.
- [ ] CTA placeholder:
  - click `Crea Cameriere`, apertura/chiusura dialog.
- [ ] Promozione da board:
  - da card candidato -> `Promuovi a Cameriere`;
  - verificare record in citta corretta e assenza duplicazione su click ripetuto.
- [ ] Persistenza:
  - reload pagina e verifica mantenimento dati camerieri.

#### Rimandato alla prossima iterazione
- [ ] Dialog `Crea Cameriere` completo (form, validazioni, salvataggio).
- [ ] Backend wiring `Camerieri` (migrazione da localStorage a sorgente remota + policy/tenant).

---

## Decisioni tecniche vive

- **Board status policy**: lo stato runtime deriva sempre dalla colonna corrente.
- **Date policy**: evitare `new Date(...)` inline nei render; usare helper centralizzati e fallback.
- **Board persistence policy**: persistenza locale versionata (non cross-device finche non c'e backend).
- **Filters policy**: filtri `Nuovo` persistenti per citta; filtro nascosto => filtro disattivato/reset.
- **Discard policy**: `scartati` è stato strutturato (catalogo ragioni v1 chiuso + nota opzionale). Il move avviene solo dopo conferma del dialog (parità con `colloquio`/`postpone`). Uscire dalla colonna (`Ripristina`, archivio, drop su altra colonna) ripulisce automaticamente `discardReasonKey|Note|At|ReturnStatus` via `clearDiscardMetadataIfNeeded`. `Promuovi a Cameriere` non è esposto in `scartati`.
- **Contract policy**: nuove key CMS prima in `@g3/content-contract`, poi propagate ad admin/web.
- **Auth policy**: fuori scope finche non parte lo step sicurezza.
- **Campagne status policy**: usare `first_data_at` (primo `page_view` con `cid`) e `last_data_at` (ultimo evento attribuito) come uniche fonti canoniche.
- **Campagne query policy**: derivare `No dati|Attiva|Disattiva` a runtime (finestra 5 giorni) senza persistere `status` in colonna nella v1.
- **Campagne identity policy**: `campaigns.id` (uuid) è l’ID interno canonico; `cid` resta token corto pubblico per link tracking.
- **Cities legacy policy**: gli slug seed `modena` / `sassari` non sono eliminabili da UI finché board/camerieri dipendono da compatibilità locale; disattivazione consentita.
- **Waiters sidebar policy**: la navigazione CRM Camerieri espone solo slug presenti in `SUPPORTED_WAITER_CITY_SLUGS` finché `admin:camerieri:crm:v1` resta bucketato su `modena|sassari`.

---

## TODO pre-lancio effettivo (priorita)

- [ ] **Board persistence server-side**: migrare da localStorage a persistenza DB condivisa.
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
| Board candidati | `admin:candidates:board:v1` | `candidates` + stato workflow/ordinamento dove necessario |
| Filtri colonna `Nuovo` | `admin:candidates:new-column-filters:state:v1:{modena|sassari}` | Restano preferenze locali salvo richiesta sync |
| Visibilità filtri `Nuovo` | `admin:candidates:new-column-filters:visibility:v1:{modena|sassari}` | Restano preferenze locali |
| Recap giornaliero | `admin:candidates:daily-recap:dismissed-on` | Preferenza locale, non DB v1 |
| Messaggi contatti | ~~`admin:contact-messages:v1`~~ (legacy); lista ora da **`contact_messages`** | `contact_messages` (L2 ✓) |
| Camerieri CRM | `admin:camerieri:crm:v1` + evento `admin:camerieri:updated` | `staff` |
| Sedi | ~~`admin:cities:v1`~~ (legacy); dati da **`public.cities`**; evento **`admin:cities:updated`** solo segnale UI post-mutazione | `cities` (E4 ✓) |
| Board update | evento `admin:candidates:board-updated` | Sostituire con invalidazione/query refresh adapter |
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
- **Perimetro residuo:** E3 (Storage CMS/campagne oltre careers); E4 residuo (**board**, **camerieri**, **campagne** — sedi e messaggi già migrati); L3/L5 come da roadmap.

Riferimenti: `supabase/README.md`, `docs/CAMPAIGNS_CONTRACT.md`, `docs/ANALYTICS_INGEST_CONTRACT.md`, `docs/DB_CMS_INTEGRATION.md`.

---

## TODO post-lancio / evolutivi

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

## Checklist rapida per nuove chat

1. Eseguire `pnpm build:admin`.
2. Eseguire `pnpm test:board`.
3. Se tocchi CMS: verificare allineamento con `@g3/content-contract`.
4. Se tocchi board: smoke test su DnD, dialog workflow, recap, filtri, persistenza.
5. Se introduci fetch remoto: passare sempre da adapter/normalizzazione con fallback.
