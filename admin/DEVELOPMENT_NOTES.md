# Admin Development Notes

## Scope

Queste note descrivono lo stato reale di `admin` in fase sviluppo demo/pre-cliente, con focus su:
- board candidature;
- allineamento contratto contenuti `admin <-> web`;
- passaggio futuro a Supabase/Auth.

---

## Stato corrente (aggiornato)

### 0) Dashboard / Overview

Implementato (mock coerente):
- [x] mantenuti i grafici principali:
  - `Messaggi e candidature per mese`
  - `Fonte traffico (candidature)`
- [x] sostituito il blocco `Trend ultimi mesi` con `Traffico ultimi 3 mesi`:
  - serie mock: `visite`, `click CTA`, `form inviati`.
- [x] aggiunto blocco `Pipeline candidature per citta`:
  - confronto `Modena` / `Sassari` su stati `Nuovo`, `Colloquio`, `Formazione`.
- [x] aggiornate le KPI card top con valori demo piu realistici per presentazione.
- [x] stabilizzato hover grafici per demo:
  - tooltip chart con `cursor={false}` e `isAnimationActive={false}` per evitare transizioni incerte tra barre/serie.
- [x] pulizia microcopy client-facing:
  - rimossi testi troppo developer-oriented da Dashboard, Inbox messaggi, CMS editor, SEO, Impostazioni e dialog board.

### 1) Board candidature (`CandidatiBoard`)

Implementato:
- [x] Drag and drop con `@dnd-kit` tra colonne e riordino nella stessa colonna.
- [x] Persistenza localStorage (`admin:candidates:board:v1`) con payload versionato v2 (`columns` + `byId`).
- [x] Parsing date robusto (helper centralizzati, fallback su date invalide).
- [x] Strategia stato unico: source of truth runtime sulle **colonne** (evita drift con `candidate.status`).
- [x] Vista card semplificata: rimossa vista Avatar, mantenuta solo **Side Image**.
- [x] Refactor board in moduli dedicati per leggibilita/manutenzione:
  - `admin/src/components/candidati-board/useCandidateBoardState.ts`
  - `admin/src/components/candidati-board/board-utils.ts`
  - `admin/src/components/candidati-board/date-utils.ts`
  - `admin/src/components/candidati-board/candidate-utils.ts`
  - `admin/src/components/candidati-board/CandidateCard.tsx`
  - `admin/src/components/candidati-board/KanbanColumn.tsx`
  - `admin/src/components/candidati-board/CandidateDetailSheet.tsx`
  - `admin/src/components/candidati-board/WorkflowDrawerLane.tsx`
  - `admin/src/components/candidati-board/ScoreBadge.tsx`
  - orchestratore: `admin/src/components/CandidatiBoard.tsx`
- [x] Primo step workflow metadata:
  - `Candidate` esteso con metadati opzionali per `colloquio` e `formazione`;
  - note card contestuali in base allo stato (colloquio/formazione/rimando);
  - `CandidateDetailSheet` con sezione workflow dedicata per stato corrente.
- [x] Recap sessione board (`Dialog`) all'ingresso:
  - mostra contatori rapidi (`Nuovi`, `Colloqui oggi`, `Formazione oggi`);
  - mostra lista breve candidati rimandati (`chi + quando`, max 5);
  - opzione `Non mostrare piu oggi` con persistenza localStorage.
- [x] Regola workflow: quando una card esce da `in_attesa/rimandati` verso lane attive (`nuovo/colloquio/formazione`),
  vengono puliti i metadati di rimando per evitare badge stale.
- [x] Prima transizione assistita su drag&drop:
  - drop verso `colloquio` apre dialog di pianificazione (data + ora + nota);
  - lo spostamento viene confermato solo dopo salvataggio dialog.
- [x] Estensione transizioni assistite:
  - drop verso `in_attesa` apre dialog `Rimanda` (riuso flusso esistente);
  - drop verso `formazione` apre dialog dedicato (teoria/pratica + nota formazione);
  - menu contestuale card esteso con azioni rapide: `Pianifica colloquio` / `Pianifica formazione`.
- [x] UX refinement dialog workflow:
  - `Colloquio`: rimosso campo `esito` in ingresso, aggiunti `data` + `ora` + `nota` opzionale;
  - `Formazione`: rimosso selettore percorso, introdotte date separate `Teoria`/`Pratica` (entrambe opzionali, almeno una richiesta);
  - date picker uniformati con `shadcn/ui Calendar` per `Colloquio`, `Formazione`, `Rimanda`.
- [x] Board persistence locale migliorata:
  - storage locale portato a formato versionato v2 (`columns` + `byId`) con backward compatibility v1;
  - i metadati workflow (colloquio/formazione/rimando) non si perdono al reload.
- [x] Calendar awareness nei dialog pianificazione:
  - date picker evidenziano i giorni con attivita gia pianificate;
  - marker a punti multi-evento (evita conflitti quando nello stesso giorno ci sono tipi diversi);
  - legenda colori/marker integrata nei picker.
- [x] Candidate detail workflow shortcuts:
  - dal `CandidateDetailSheet` e ora possibile aprire direttamente i flussi `Pianifica colloquio`, `Pianifica formazione`, `Rimanda candidatura`;
  - avatar/foto profilo con anteprima ingrandita su click (soluzione cross-device, non solo hover).
- [x] Note workflow e note generali:
  - aggiunta `trainingNote` per la fase formazione;
  - sezione `Note generali` nel `CandidateDetailSheet` resa editabile con `Textarea` dedicata;
  - separazione visiva della sezione note per migliorare colpo d'occhio.
- [x] Autosave note generali nello sheet:
  - salvataggio automatico con debounce durante la digitazione;
  - salvataggio di sicurezza alla chiusura dello sheet se ci sono modifiche pendenti.
- [x] Refactor layout `CandidateDetailSheet`:
  - bio ridotta per colpo d'occhio (eta/titolo/citta/disponibilita/lingue);
  - approfondimenti profilo in sezione espandibile;
  - dettagli workflow in blocchi collassabili chiusi di default;
  - note generali spostate in fondo allo sheet.
- [x] Editing workflow inline nel detail sheet:
  - i blocchi `Colloquio`, `Formazione`, `Rimando` supportano ora modifica diretta in-place;
  - salvataggio immediato dei metadati workflow (senza passare dai dialog di transizione);
  - campi data uniformati con date picker `shadcn/ui Calendar` anche nello sheet.
- [x] Reminder operativi rimandati (MVP):
  - classificazione `Scaduti` / `Oggi` / `Prossimi 7gg` nel recap iniziale board;
  - quick action `Apri rimandati` direttamente dal recap;
  - indicatore sintetico nella colonna `In attesa` (focus su scaduti/oggi).
- [x] Flusso rimando consolidato (cross-fase):
  - il rimando e azione trasversale da `Nuovo` / `Colloquio` / `Formazione`;
  - il candidato viene parcheggiato in `In attesa` con metadati (`data`, `motivo`);
  - viene tracciato lo stato di provenienza (`postponeReturnStatus`) per una ripresa coerente nel funnel.
- [x] Formazione evoluta - fase 1 (sub-lane dinamiche):
  - introdotte sub-lane dinamiche in colonna `Formazione` per tipo/data (`Teoria`/`Pratica`);
  - flusso 1: `Pianifica formazione` crea/riusa sub-lane coerenti e assegna la card;
  - flusso 2: drag&drop diretto su una sub-lane applica automaticamente tipo/data della sub-lane al candidato;
  - supportata area `Da assegnare` per candidati in formazione senza sub-lane valida.
- [x] Formazione evoluta - chiarimento fase attiva:
  - una candidatura in formazione ha ora una sola fase attiva (`teoria` oppure `pratica`);
  - il dialog `Pianifica formazione` usa fase singola + data singola;
  - normalizzazione compatibile su dati legacy per evitare casi ambigui con teoria/pratica attive insieme.
- [x] Semplificazione UX sub-lane formazione:
  - comportamento confermato: trascinamento in colonna `Formazione` apre il dialog classico di pianificazione;
  - supportato anche drag&drop diretto in sub-lane esistenti (`Teoria`/`Pratica`) per assegnazione rapida;
  - le sub-lane non sono ordinabili come card (evita conflitti di movimento verticale e drop ambiguo).
- [x] Filtri colonna `Nuovo` evoluti:
  - aggiunto filtro `Eta` con range custom (`18-60`) tramite slider;
  - filtro `Eta` attivo automaticamente solo quando il range differisce dal default (`18-60`);
  - introdotta personalizzazione visibilita filtri toolbar (`auto`, `eta`, `esperienza`, `disponibilita`, `residenza`, `lingue`);
  - default visibilita: solo `auto` + `eta`.
- [x] UX filtri toolbar (hardening):
  - impostazioni filtri apribili con tasto destro sui filtri della colonna `Nuovo`;
  - hint centralizzato nel menu `Aiuto` della topbar (`Board`) per evitare testo ripetuto su ogni tooltip;
  - icona filtro lingue aggiornata per maggior chiarezza visiva.
- [x] Persistenza filtri `Nuovo` (per citta board):
  - aggiunta persistenza localStorage per visibilita filtri e stato filtri (non solo board columns);
  - storage separato per `modena`/`sassari` con chiavi dedicate:
    - `admin:candidates:new-column-filters:visibility:v1:<city>`
    - `admin:candidates:new-column-filters:state:v1:<city>`
  - al nascondimento di un filtro viene resettato anche il suo stato attivo (evita filtri invisibili ma applicati).

Da completare (board):
- [x] Consolidare editing completo metadati workflow direttamente nello sheet (modifica inline su colloquio/formazione/rimando).
- [x] Transizioni assistite drag&drop: dialog contestuali su drop in `colloquio`/`formazione`/`in_attesa`.
- [x] Colonna Formazione evoluta - step iniziale: sub-lane dinamiche con assegnazione via dialog/drop.
- [ ] Refactor tecnico board: spezzare `useCandidateBoardState` e `KanbanColumn` in moduli piu piccoli (stato filtri/persistenza/dialog/recap separati).
- [ ] Migrare persistenza da localStorage a Supabase quando il backend e pronto.

### 2) CMS Admin -> Web

Implementato:
- [x] Section key lato admin allineate al contratto web:
  - `hero`, `about`, `clients`, `why_g3`, `footer`, `sections`.
- [x] In `CmsWeb` le tab usano le key canoniche del contratto.
- [x] `CmsWeb` convertito da placeholder a editor JSON base per ogni sezione.
- [x] CRUD base lato admin su Supabase:
  - load iniziale da tabella configurabile (`VITE_SUPABASE_CMS_TABLE`, default `cms_sections`);
  - save per singola sezione via `upsert` (`section_key`, `content`, `updated_at`);
  - supporto opzionale filtro tenant (`VITE_TENANT_SCHEMA`).
- [x] Fallback locale mantenuto se Supabase non e configurato o non raggiungibile.
- [x] Migrazione UX Web Editor (MVP Hero):
  - rimosso editing JSON lato utente finale;
  - introdotto form guidato per `Hero` con validazioni e microcopy non tecnica;
  - aggiunta anteprima live leggera (editoriale) della sezione Hero;
- [x] CMS UX rollout completato su tutte le sezioni:
  - `about`: form guidato con campi testo/immagine + anteprima rapida;
  - `clients`: lista clienti editabile (aggiungi/rimuovi) + guardrail su righe incomplete + anteprima contatore;
  - `why_g3`: motivi editabili con icone tipizzate + anteprima stato contenuti;
  - `footer`: contatti/legale con validazione link + placeholder contestuali + anteprima contatti completi;
  - `sections`: toggle guidati con riepilogo moduli attivi.
- [x] Hardening UX editor CMS:
  - `Ricarica contenuti` ora chiede conferma se esistono modifiche non salvate (evita overwrite involontari);
  - `Salva modifiche` disabilitato quando la sezione corrente non ha cambiamenti (`dirty=false`).
- [x] Ottimizzazione caricamento CMS:
  - `Web Editor` lazy-loaded a livello pagina (`App.tsx`) per ridurre il payload iniziale dell'admin shell.
  - introdotto fallback standard riusabile (`PageLoadingFallback`) per uniformare UX durante il loading delle pagine lazy.

### 3) Contratto condiviso section key

Implementato ora:
- [x] Creato package workspace `@g3/content-contract` in `packages/content-contract`.
- [x] Espone costanti/tipi/hints condivisi:
  - `CMS_SECTION`
  - `CMS_SECTION_KEYS`
  - `normalizeCmsSectionKey()`
  - `CMS_SECTION_TOGGLE`
  - `CMS_SECTION_TOGGLE_ALIASES`
- [x] Integrato in:
  - `admin/src/components/CmsWebEditor.tsx`
  - `web/lib/content-adapter.ts`

Nota architetturale:
- il contratto condiviso centralizza i nomi canonical e gli alias principali (es. `whyG3`, `why-g3`) per evitare mismatch futuri.
- gli alias toggle (`contact_form`, `careers_form`) restano supportati in web adapter per backward compatibility.

### 4) Monitor client Supabase (diagnostica)

Implementato:
- [x] Card `Monitor Supabase` nella pagina `Impostazioni`.
- [x] Check automatico al mount + retry manuale.
- [x] Stato sintetico: `Online`, `Offline`, `Configurazione mancante`, `Verifica in corso`.
- [x] Telemetria base: latenza ultima verifica, ultimo controllo, dettaglio errore/stato.

Nota:
- il monitor usa `supabase.auth.getSession()` come probe non distruttivo per validare reachability client/server in ambiente admin.
- monitor avanzato DB/RLS e storico verifiche: rimandato volontariamente a step successivo.

### 5) Contatti > Messaggi (`GestionaleContatti`)

Stato attuale:
- [x] Pagina reale MVP presente in admin (`admin/src/components/contact-messages/*`), con componenti separati:
  - `ContactMessagesPage` (orchestrazione stato/filtro/contatori);
  - `ContactMessagesToolbar` (ricerca + filtro stato);
  - `ContactMessagesTable` (lista tabellare + azioni rapide);
  - `ContactMessageDetailSheet` (dettaglio + cambio stato);
  - `ContactMessageStatusBadge` (UI stato coerente).
- [x] Routing/sidebar collegati in `App.tsx` (`Contatti > Messaggi`).
- [x] `GestionaleContatti` ridotto a wrapper per evitare overload del file.
- [x] Persistenza locale MVP per inbox:
  - store locale `admin:contact-messages:v1` con seed automatico da mock;
  - aggiornamento stato messaggi persistente in localStorage;
  - evento custom `admin:contacts:messages-updated` per sincronizzare badge e viste.
- [x] Badge sidebar `Messaggi` collegato al conteggio reale locale dei soli messaggi `nuovo`.

Contratto dati lato web (source form pubblico):
- componente `web/components/contact-form.tsx`
- payload inviato all'endpoint `VITE_CONTACT_ENDPOINT`:
  - `fullName` (obbligatorio)
  - `company` (opzionale)
  - `email` (obbligatorio + validazione formato)
  - `phone` (obbligatorio)
  - `city` (opzionale)
  - `message` (obbligatorio)

Gap da colmare in admin:
- [ ] sostituire la sorgente locale con backend reale (`contact_messages` o endpoint adapter) coerente col payload web;
- [ ] aggiungere persistenza stato (`nuovo`, `letto`, `archiviato`) lato backend;
- [ ] aggiungere handling errori/retry e stati empty/loading da fetch remoto.

Decisione di rollout:
- [x] In questa fase il gestionale messaggi resta locale (MVP) per velocizzare il pre-lancio demo.
- [ ] Backend wiring messaggi rimandato alla checklist **prima del lancio effettivo** (insieme al wiring Supabase production-safe).

---

## Decisioni tecniche importanti

- **Board status policy**: lo stato candidatura a runtime e derivato dalla colonna corrente (single source of truth).
- **Date handling policy**: no `new Date(...)` inline nei render per campi input esterni; usare helper safe + fallback UI.
- **Persistence policy (board attuale)**: board + sub-lane formazione persistono in localStorage (schema versionato), quindi non sono cross-device finche non viene completato wiring Supabase.
- **Filters policy (colonna Nuovo)**: i filtri sono persistenti per citta board; un filtro nascosto viene anche disattivato/reset per coerenza UX.
- **Contract policy**: nuove key sezione/toggle vanno aggiunte prima in `@g3/content-contract`, poi in admin/web.
- **Auth policy**: fuori scope attuale; verra introdotta insieme al wiring Supabase reale.

---

## TODO prioritari (prossime chat)

- [ ] **Board persistence (High):** migrare board da localStorage a persistenza server quando backend pronto.
- [x] **CMS UX rollout (High):** form user-friendly esteso anche a `about`, `clients`, `why_g3`, `footer`, `sections`.
- [x] **SEO panel (High):** implementata pagina `SEO` reale in admin con salvataggio manuale e validazioni base.
- [x] **CMS menu cleanup:** voce `Media` rimossa dalla sidebar (workflow media accorpato nel `Web Editor`).
- [ ] **Contatti > Messaggi backend wiring (High):** collegare il gestionale MVP a sorgente dati reale + persistenza stati (task pre-lancio effettivo).
- [ ] **Lazy load pagine admin (Medium):** estendere il code-splitting ad altre pagine pesanti (`Board`, `SEO`, `Settings`) con fallback UX coerente.
- [ ] **Supabase monitor avanzato (Medium):** aggiungere health check esteso (es. endpoint DB/RLS specifici) e storico verifiche.
- [x] **Showcase cleanup (Medium):** modulo Showcase rimosso da sidebar/routing admin.
- [x] **Sidebar UX (Medium):** scrollbar sidebar nascosta mantenendo scroll attivo (`SidebarContent` con hide-scrollbar cross-browser).
- [x] **Impostazioni UI (High):** implementata pagina reale `Impostazioni` con Tema + Logout (solo UI) e rimozione toggle rapido da sidebar/footer.

### Rimandato a design terminato (esplicitamente)

Questi temi sono congelati fino a chiusura design UI/UX:
- [ ] **Auth/protezione admin:** login + guard route + policy minime.
- [ ] **Wiring CMS Supabase production-safe:** verifica schema, policy RLS, tenant separation, error handling consolidato.
- [ ] **Web runtime da DB:** lettura reale da Supabase con feature flag/fallback robusto.
- [ ] **Publish flow:** `draft/published` + `updated_at`/versioning per sezione.
- [ ] **Storage media strutturato:** bucket/policy/metadata completi (oltre upload Hero base).

### TODO dettagliato: Pagina Impostazioni (Tema + Logout, UI only)

Scope richiesto:
- [x] Nuovo componente pagina (`SettingsPage`) al posto del placeholder attuale.
- [x] Sezione **Aspetto** con selettore tema:
  - `Chiaro`
  - `Scuro`
  - `Auto` (segue sistema)
- [x] Persistenza preferenza su localStorage (`admin-theme-preference`), default primo avvio `auto`.
- [x] Backward compatibility:
  - migrazione one-shot da chiave legacy `admin-theme` (`light|dark`) se presente e nuova assente.
- [x] In modalita `auto`, reagire ai cambi runtime di `prefers-color-scheme`.
- [x] Continuare ad applicare tema via classe `dark` su `document.documentElement`.
- [x] Non rompere gestione eventuale `data-base` dei colori.
- [x] Sezione **Account** con pulsante `Logout` (solo UI, no auth/backend), comportamento placeholder esplicito.
- [x] Rimuovere toggle tema rapido da sidebar/footer (spostamento completo gestione tema in `Impostazioni`).
- [x] Microcopy italiano coerente con resto admin.
- [x] Accessibilita: label/aria corretti, focus ring visibile, descrizioni comprensibili.

Verifica richiesta:
- [x] Build/lint/typecheck puliti.
- [ ] Test manuale:
  - `Auto` + reload + allineamento a OS
  - cambio tema OS runtime e aggiornamento admin
  - `Chiaro/Scuro` persistono al reload
  - logout button visibile/coerente UI
  - sidebar senza toggle tema rapido

### Stato implementazione Step 1 (completato)

File principali toccati:
- `admin/src/App.tsx`
- `admin/src/components/SettingsPage.tsx`
- `admin/src/lib/theme-preference.ts`
- `admin/components/ui/sidebar.tsx`

Note operative:
- la preferenza tema e ora centralizzata in `App` (`light|dark|auto`) e salvata in `admin-theme-preference`;
- in avvio viene gestita migrazione one-shot dalla chiave legacy `admin-theme`;
- in modalita `auto` il tema reagisce ai cambi runtime OS via listener `matchMedia`;
- il vecchio `ThemeToggle` in sidebar/footer non e piu montato;
- la scrollbar sidebar e nascosta con utility CSS cross-browser, mantenendo lo scroll funzionante.

---

## Handoff checklist rapida

Quando riprendi lo sviluppo in una nuova chat:
1. Verifica build `admin` e `web`.
2. Verifica che ogni nuova sezione CMS usi `@g3/content-contract`.
3. Se tocchi board: testa drag/drop, postpone, archivio, restore, persistenza localStorage.
4. Se introduci payload remoti: passa sempre da adapter/normalizzazione con fallback.

---

## Roadmap proposta (ripartenza)

### Step 1 — Hardening UI shell admin (breve)
1. Sistemare sidebar UX:
   - rimozione scrollbar visibile con soluzione non invasiva (senza perdere scroll/tastiera).
2. Introdurre pagina `Impostazioni` reale:
   - Tema (`light|dark|auto`) + persistenza + migrazione chiave legacy.
   - Logout button UI only.
3. Rimuovere toggle rapido tema dalla sidebar/footer.
4. Verifica completa build + smoke test UI.

### Step 2 — CMS runtime wiring
1. Portare `CmsWebEditor` da placeholder a editor base sezione.
2. Collegare CRUD admin a Supabase per `hero/about/clients/why_g3/footer/sections`.
3. Mantenere fallback e compatibilita web adapter (`content-adapter.ts`).

### Step 3 — Publish e contenuti media
1. Draft/published + `updated_at`.
2. Feature flag locale/DB lato web.
3. Storage media (bucket/policy/metadata) con rollout progressivo.

### Step 4 — Sicurezza e chiusura loop
1. Guard/Auth admin.
2. Migrazione persistenza board da localStorage a DB.
3. Cleanup finale (`Showcase`, dead code, QA regressioni).
