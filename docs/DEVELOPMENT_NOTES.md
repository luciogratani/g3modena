# Admin Development Notes

## Scope

Stato sintetico di `admin` in fase pre-lancio demo, con focus su:
- board candidature;
- CMS editor + SEO + contatti;
- decisioni architetturali in vista di DB/Auth.

Piano dati condiviso con `web` (schema Supabase previsto, sequenza pre-wiring): [`DB_CMS_INTEGRATION.md`](DB_CMS_INTEGRATION.md) — sezione **Parte Admin**.

Concept pre-coding (campagne, analytics, città + form, RLS): [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md).

---

## Stato attuale (pre-lancio)

### Dashboard / Shell
- [x] Dashboard demo coerente (`Messaggi+candidature`, `Fonte traffico`, `Traffico ultimi 3 mesi`, `Pipeline per citta`).
- [x] Microcopy client-facing ripulita (rimosso linguaggio troppo tecnico).
- [x] Sidebar ripulita (`Showcase` rimosso, sezione candidati semplificata, badge collegati ai dati).
- [x] Pagina `Impostazioni` reale con tema `light|dark|auto` + persistenza + migrazione chiave legacy.
- [x] Pagina **Marketing › Campagne** (`CampagnePage`) MVP locale (builder UTM/`cid`, card demo); contratto operativo [`CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md).

### Board candidature
- [x] DnD stabile con `@dnd-kit` (riordino intra-colonna + movimenti inter-colonna).
- [x] Workflow assistito con dialog su transizioni (`colloquio`, `formazione`, `in_attesa`).
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
- [x] `Contatti > Messaggi` presente come MVP locale persistente (localStorage + badge sincronizzati via custom event).

### Diagnostica Supabase
- [x] Card `Monitor Supabase` in `Impostazioni` con check mount + retry.
- [x] Stati e telemetria base (`Online/Offline/Config mancante/In corso`, latenza, ultimo controllo).

### Sedi / cities (MVP locale, pre-DB)
- [x] Pagina **Config › Sedi** (`CitiesPage`) integrata in `admin/src/App.tsx`.
- [x] Modello `OfficeCity` (`City` alias): `id`, `slug`, `displayName`, `isActive`, `sortOrder` — `admin/src/components/cities/types.ts`.
- [x] Storage versionato `admin/src/components/cities/storage.ts`:
  - chiave **`admin:cities:v1`** (`CITIES_STORAGE_KEY`);
  - evento UI **`admin:cities:updated`** (`CITIES_UPDATED_EVENT`);
  - seed iniziale **modena**, **sassari**; parser/sanitizer difensivo + fallback se JSON corrotto.
- [x] API storage esposta: `loadCities`, **`listActiveCities()`** (per Step successivo: sidebar Candidati/Camerieri dinamici), CRUD + `moveCity`, `deleteCity`, helper `isCityDeleteLocked` / `canDeleteCity`.
- [x] UX: slug univoca; conferma su cambio slug in modifica; attiva/disattiva; ordinamento su/giù; empty state ed errori accessibili.
- **Limite attuale:** eliminazione **non consentita** per sedi legacy con slug `modena` e `sassari` (insieme `LEGACY_LOCKED_SLUGS` nello storage).

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
- [x] Sidebar/routing `Camerieri > Modena/Sassari` (pattern coerente a `Candidati`).
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
- [x] Sidebar mostra `Camerieri > Modena/Sassari` funzionanti.
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
- **Contract policy**: nuove key CMS prima in `@g3/content-contract`, poi propagate ad admin/web.
- **Auth policy**: fuori scope finche non parte lo step sicurezza.
- **Campagne status policy**: usare `first_data_at` (primo `page_view` con `cid`) e `last_data_at` (ultimo evento attribuito) come uniche fonti canoniche.
- **Campagne query policy**: derivare `No dati|Attiva|Disattiva` a runtime (finestra 5 giorni) senza persistere `status` in colonna nella v1.
- **Campagne identity policy**: `campaigns.id` (uuid) è l’ID interno canonico; `cid` resta token corto pubblico per link tracking.
- **Cities legacy policy**: gli slug seed `modena` / `sassari` non sono eliminabili da UI finché board/camerieri dipendono da compatibilità locale; disattivazione consentita.

---

## TODO pre-lancio effettivo (priorita)

- [ ] **Board persistence server-side**: migrare da localStorage a persistenza DB condivisa.
- [ ] **Contatti > Messaggi backend wiring**: sorgente dati reale + persistenza stato (`nuovo/letto/archiviato`) + error handling.
- [ ] **CMS wiring production-safe**: verifica schema, RLS/policy, tenant separation, fallback robusto.
- [ ] **Web runtime da DB**: lettura reale contenuti da Supabase con fallback/feature-flag.
- [ ] **Auth/protezione admin**: login + guard route + policy minime.

---

## Inventario migrazione DB (pre-wiring)

Questa sezione fotografa le sorgenti locali che dovranno essere considerate quando si passa a Supabase. Il modello dati completo resta descritto in `docs/DB_CMS_INTEGRATION.md` e nel concept pre-wiring.

### Decisioni schema da rispettare

- **Città:** usare `cities.id` come FK (`city_id`) sulle tabelle operative; `cities.slug` sostituisce il concetto legacy `city_code` (`modena`, `sassari`) per URL, seed, export e mapping da dati locali.
- **Candidati:** tabella `candidates` con mapping dal form web e stato workflow admin (`pipeline_stage` o equivalente). Allegati v1 come path diretti (`profile_photo_path`, `cv_path`), senza tabella attachment dedicata.
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
| Messaggi contatti | `admin:contact-messages:v1` + evento `admin:contacts:messages-updated` | `contact_messages` |
| Camerieri CRM | `admin:camerieri:crm:v1` + evento `admin:camerieri:updated` | `staff` |
| Sedi | `admin:cities:v1` + evento `admin:cities:updated` | `cities` |
| Board update | evento `admin:candidates:board-updated` | Sostituire con invalidazione/query refresh adapter |
| Tema admin | `admin-theme-preference` (`admin-theme` legacy) | Resta localStorage |

### Env Supabase admin già usate dal codice

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_CMS_TABLE` (default `cms_sections`)
- `VITE_TENANT_SCHEMA` (opzionale)
- `VITE_SUPABASE_MEDIA_BUCKET` (default `site-media`)

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
