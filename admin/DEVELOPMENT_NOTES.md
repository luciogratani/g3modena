# Admin Development Notes

## Scope

Stato sintetico di `admin` in fase pre-lancio demo, con focus su:
- board candidature;
- CMS editor + SEO + contatti;
- decisioni architetturali in vista di DB/Auth.

---

## Stato attuale (pre-lancio)

### Dashboard / Shell
- [x] Dashboard demo coerente (`Messaggi+candidature`, `Fonte traffico`, `Traffico ultimi 3 mesi`, `Pipeline per citta`).
- [x] Microcopy client-facing ripulita (rimosso linguaggio troppo tecnico).
- [x] Sidebar ripulita (`Showcase` rimosso, sezione candidati semplificata, badge collegati ai dati).
- [x] Pagina `Impostazioni` reale con tema `light|dark|auto` + persistenza + migrazione chiave legacy.

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

### Camerieri (MVP split-view CRM + Timeline)

Contesto prodotto (vincolo forte):
- vista orientata a CRM + disponibilita medio termine (3-5 settimane), non pianificazione giornaliera;
- niente calendario mensile tradizionale;
- planning operativo dettagliato resta su software esterno.

#### Strategia di implementazione usata (safe order)
0. allineamento note + scope `now vs future`;
1. fondazioni dati (modello + storage locale versionato + idempotenza);
2. sidebar/routing per flusso end-to-end navigabile;
3. shell split-view desktop (70/30) con pannello destro placeholder;
4. CRM sinistro reale (tabella, ricerca/filtro, CTA placeholder);
5. promozione da board candidati verso storage camerieri;
6. hardening con build/lint/test board.

#### Stato implementato ORA
- [x] Sidebar/routing `Camerieri > Modena/Sassari` (pattern coerente a `Candidati`).
- [x] Pagina desktop split-view con resize drag (`ResizablePanelGroup`) e default `left 70% / right 30%`.
- [x] Pannello sinistro CRM operativo con colonne minime richieste:
  - avatar;
  - nome e cognome;
  - contatto;
  - stato attivo;
  - tag sintetici.
- [x] Ricerca base (nome/email/telefono/tag) + filtro stato (`all|active|inactive`).
- [x] CTA `Crea Cameriere` con dialog placeholder.
- [x] Modello dati dedicato `Cameriere` separato da `Candidato`.
- [x] Storage locale versionato dedicato:
  - key: `admin:camerieri:crm:v1`;
  - parser/sanitizer robusto con fallback safe;
  - bucket per citta `modena|sassari`.
- [x] Promozione da board candidati (`Promuovi a Cameriere`) con idempotenza minima:
  - upsert su `sourceCandidateId`;
  - no duplicazioni evidenti anche su promozioni ripetute.
- [x] Pannello destro timeline predisposto come placeholder tecnico (header + shell vuota).

#### Struttura modulare introdotta
`admin/src/components/camerieri/`
- `types.ts`
- `storage.ts`
- `mappers.ts`
- `useCamerieri.ts`
- `CamerieriPage.tsx`
- `CamerieriCrmPanel.tsx`
- `CamerieriTimelinePanel.tsx`
- `CamerieriTable.tsx`
- `CreateCameriereDialog.tsx`

Integrazioni cross-modulo:
- `admin/src/App.tsx` (sidebar + routing);
- board candidati (`CandidateCard` / `KanbanColumn` / `CandidatiBoard` / `useCandidateBoardState`) per azione promozione.

#### Criteri di accettazione coperti
- [x] Sidebar mostra `Camerieri > Modena/Sassari` funzionanti.
- [x] Split-view desktop presente con default `70/30` + divisore drag.
- [x] CRM sinistro operativo con Avatar + Nome/Cognome (e colonne CRM minime utili).
- [x] Bottone `Crea Cameriere` apre dialog placeholder.
- [x] Context menu candidati consente promozione con persistenza locale.
- [x] Pannello destro timeline predisposto come placeholder tecnico pronto a evoluzione.

#### Smoke test manuale minimo (regressioni)
- [ ] Navigazione sidebar:
  - aprire `Camerieri > Modena` e `Camerieri > Sassari`, verificare pagina corretta.
- [ ] Split resize:
  - trascinare il divider e verificare ridimensionamento pannelli senza glitch.
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
- [ ] Timeline disponibilita completa (orizzonte settimane + sync righe CRM + interazioni).
- [ ] Dialog `Crea Cameriere` completo (form, validazioni, salvataggio).
- [ ] Backend wiring `Camerieri` (migrazione da localStorage a sorgente remota + policy/tenant).

#### Mini RFC tecnica: Timeline data-first (v0)

Obiettivo: mantenere la UX gia validata (split CRM + timeline) ma consolidare una base tecnica robusta per zoom, editing e persistenza reale.

1. Contratto dati canonico (single source of truth)
- aggiungere in `types.ts`:
  - `CameriereAvailabilityKind = "available" | "unavailable"`;
  - `CameriereAvailabilityWindow = { id, startDate, endDate, kind, note?, source?, createdAt, updatedAt }`;
  - `CameriereTimelineScale = "2w" | "1m" | "2m" | "4m"`;
- aggiungere su `Cameriere`:
  - `availabilityWindows?: CameriereAvailabilityWindow[]`.

Regole dati minime:
- intervalli semichiusi `[startDate, endDate)` per evitare ambiguita su adiacenze;
- normalizzazione giornaliera locale (00:00) nel MVP;
- ordinamento per `startDate` crescente;
- merge automatico di segmenti adiacenti con stesso `kind` (post-edit);
- in caso di overlap con `kind` diversi, vince il segmento piu recente (`updatedAt`).

2. Engine geometrico isolato (no logica date dentro JSX)
- creare `camerieri/timeline-geometry.ts` con funzioni pure:
  - `getTimelineRange(scale, referenceDate)`;
  - `dateToPercent(date, range)`;
  - `windowToSegment(window, range)`;
  - `snapDate(date, granularity)` (giorno/settimana);
  - `clampWindowToRange(window, range)`.
- vantaggio: zoom/edit diventano estensioni senza rifare il renderer.

3. Metriche layout condivise (allineamento stabile)
- creare `camerieri/timeline-constants.ts`:
  - `TIMELINE_HEADER_HEIGHT`, `TIMELINE_ROW_HEIGHT`, `TIMELINE_GRID_STROKE`;
- usare le stesse costanti in tabella sx e timeline dx;
- evitare valori "magic" duplicati tra componenti.

4. Rendering timeline (fasi)
- Fase 1: header tempo + griglia + marker "oggi" + segmenti da `availabilityWindows`;
- Fase 2: selector scala (`2w/1m/2m/4m`) con persistenza locale della scelta;
- Fase 3: drag-to-draw con preview e snapping giornaliero.

5. Persistenza e migrazione
- passare storage camerieri a `v2`:
  - mantenere backward compatibility caricando `v1` e valorizzando `availabilityWindows: []`;
  - durante la fase demo, opzionale "seed visuale" solo se la lista e vuota e solo per ambienti locali;
- introdurre helper dedicati:
  - `upsertAvailabilityWindow(cameriereId, payload)`,
  - `deleteAvailabilityWindow(cameriereId, windowId)`,
  - `normalizeAvailabilityWindows(windows)`.

6. Strategia test minima
- unit test su `timeline-geometry` (mapping date->x, clamp, snapping);
- unit test su normalizzazione finestre (merge/overlap/ordering);
- smoke UI:
  - cambio scala mantiene marker oggi e allineamento righe;
  - creazione/rimozione finestra aggiorna solo la riga interessata;
  - reload pagina mantiene finestre e scala.

Roadmap consigliata (breve):
- Step A: contratto + constants + geometry;
- Step B: render segmenti da dati persistiti (niente drag);
- Step C: zoom;
- Step D: drag-to-draw + refine UX.

---

## Decisioni tecniche vive

- **Board status policy**: lo stato runtime deriva sempre dalla colonna corrente.
- **Date policy**: evitare `new Date(...)` inline nei render; usare helper centralizzati e fallback.
- **Board persistence policy**: persistenza locale versionata (non cross-device finche non c'e backend).
- **Filters policy**: filtri `Nuovo` persistenti per citta; filtro nascosto => filtro disattivato/reset.
- **Contract policy**: nuove key CMS prima in `@g3/content-contract`, poi propagate ad admin/web.
- **Auth policy**: fuori scope finche non parte lo step sicurezza.

---

## TODO pre-lancio effettivo (priorita)

- [ ] **Board persistence server-side**: migrare da localStorage a persistenza DB condivisa.
- [ ] **Contatti > Messaggi backend wiring**: sorgente dati reale + persistenza stato (`nuovo/letto/archiviato`) + error handling.
- [ ] **CMS wiring production-safe**: verifica schema, RLS/policy, tenant separation, fallback robusto.
- [ ] **Web runtime da DB**: lettura reale contenuti da Supabase con fallback/feature-flag.
- [ ] **Auth/protezione admin**: login + guard route + policy minime.

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
