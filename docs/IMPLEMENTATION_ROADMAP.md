# Roadmap implementazione (pre-wiring)

Sequenza concordata per arrivare al **wiring Supabase** e all’**Auth** per ultimi. Usa le checkbox per segnare l’avanzamento.

Documenti di riferimento: [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md), [`DB_CMS_INTEGRATION.md`](DB_CMS_INTEGRATION.md), [`CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md), [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md).

---

## Fase A — Admin UI e stato locale

- [x] **A1 — Campagne (MVP)**  
  Sidebar Marketing › Campagne, builder UTM + `cid`, anteprima creativa, metriche/demo, base URL (`VITE_PUBLIC_SITE_ORIGIN`). Nessun DB.

- [x] **A2 — Città / sedi**  
  Gestione locale in **Config › Sedi**: tipo `OfficeCity` (`id`, `slug`, `displayName`, `isActive`, `sortOrder`). Storage `admin:cities:v1`, evento `admin:cities:updated`, export `listActiveCities()` per Step A3. Eliminate fisiche bloccate per slug legacy `modena` / `sassari`.

- [ ] **A3 — Board e sidebar candidati dinamiche**  
  Voci Candidati generate dalle città **attive**; route/board filtrate per `city_id` / slug (addio hardcode solo Modena/Sassari dove non serve più).

- [ ] **A4 — Quinta colonna board**  
  Da definire con workflow negli appunti; estensione modello/colonne pipeline se necessario.

- [ ] **A5 — Overview / dashboard**  
  Collegare KPI a dati reali o semi-reali (messaggi, pipeline, traffico) come da concept; senza tabella analytics dedicata finché non serve.

---

## Fase B — Sito pubblico (`web`)

- [ ] **B1 — Step form “Scegli la città”**  
  Select popolata da stessa fonte concettuale delle città (fino al DB: mock condiviso o fetch da adapter).

- [ ] **B2 — Propagazione UTM + `cid`**  
  Lettura query string in landing → persistenza nel funnel → invio con submit candidatura (allineato a [`CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md) se applicabile).

---

## Fase C — Analytics lato client (prima del DB)

- [ ] **C1 — Sessione funnel e `event_type` v1**  
  `session_id`, `funnel_attempt_id`, eventi congelati nel concept (`page_view`, `cta_click`, `careers_*`…).

- [ ] **C2 — Inventario `cta_key`**  
  Costante/module condiviso allineato a [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md) (inventario CTA).

- [ ] **C3 — `careers_abandon`**  
  Regola step-level + dedup (`visibilitychange` / `pagehide`, flag sessione).

- [ ] **C4 — Invio eventi**  
  Adapter: dev buffer / endpoint mock; swap successivo → `INSERT` su `analytics_events` in Supabase.

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

## Legenda aggiornamenti

Quando completi una voce, imposta `- [x]` e opzionalmente aggiungi una riga data o riferimento PR sotto la voce.

Ultimo aggiornamento checklist: **A2** completato (2026-04-30). Prossimo focus consigliato: **A3** (sidebar/board dinamiche da `listActiveCities()`).
