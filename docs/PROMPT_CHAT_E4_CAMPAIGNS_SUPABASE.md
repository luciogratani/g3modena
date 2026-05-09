# Prompt — E4 Campagne (`public.campaigns` operativo)

**Stato (2026-05-09):** **Marketing › Campagne** è cablato a **`public.campaigns`** — repository (`campaigns-repository.ts`), bucket **`campaign-previews`**, lista con signed URL anteprima, builder con validazione contratto e **INSERT** (incluso retry **`cid`**). **Step 5 + Step 6 chiusi** (vedi sotto): timeline campagne (`first_data_at` / `last_data_at`) e KPI minime sulle card sono ora popolate dal nuovo flusso analytics ingest.

**Step 5 (`first_data_at` / `last_data_at`) — chiuso (2026-05-09, **L6**):** aggiornamento server-side dalla Edge Function **`supabase/functions/analytics-ingest`** dopo l'insert evento attribuito, via RPC **`apply_campaign_event_timeline`** (migrazione `20260509000010`). Vedi prompt analytics: [`PROMPT_CHAT_ANALYTICS_INGEST_SUPABASE.md`](PROMPT_CHAT_ANALYTICS_INGEST_SUPABASE.md) Step 6.

**Step 6 (KPI card) — chiuso v1 (2026-05-09, **L6**):** RPC **`campaign_kpi_aggregates_v1`** (migrazione `20260509000020`) restituisce 5 conteggi per campagna (`page_view`, `cta_click`, `careers_form_open`, `careers_submit`, `careers_abandon`); `loadCampaignsForAdmin` li fonde in `metrics`; `CampagnePage` mostra fallback **"In attesa dati"** sulle card senza eventi. Restano placeholder (zero) le voci `candidates_created`, `avg_registration_seconds`, `conversioni per citta` (rimandate, vedi prompt analytics §"Decisioni operative").

**Schema già deployabile:** [`supabase/migrations/20260501000020_create_campaigns.sql`](../supabase/migrations/20260501000020_create_campaigns.sql); RLS **`authenticated`** full CRUD sulla tabella; **`anon`** non legge direttamente `campaigns` (solo bridge `resolve_campaign_id_from_cid` lato ingest/L1).

**Contratto canonico:** [`docs/CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md) (campi obbligatori, stato runtime §2, KPI §5, storage creatività §6).

**Impatto prodotto:** dopo il wiring, ogni **`cid`** usato nei link deve **esistere** in `public.campaigns` affinché L1 attribuisca `campaign_id` correttamente.

**Riferimenti da leggere prima:** [`docs/CAMPAIGNS_CONTRACT.md`](CAMPAIGNS_CONTRACT.md), migrazione `00020_create_campaigns`, [`supabase/README.md`](../supabase/README.md) matrice RLS, pattern repository esistenti: `admin/src/components/camerieri/staff-repository.ts`, `admin/src/components/cities/storage.ts`. Opzionale: [`docs/PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md`](PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md) come modello di esecuzione a step singoli.

---

## Prompt (copia da qui)

Sei nel monorepo **g3modena** (`admin/` + `supabase/`). Obiettivo: collegare **`CampagnePage`** a **`public.campaigns`** via client Supabase autenticato (`admin/src/lib/supabase.ts`), sostituendo lo stato in-memory/demo.

### Vincolo esecuzione — **uno step per volta** (obbligatorio)

Per modelli **con poco contesto** e per ridurre errori:

1. **Un solo numero di step** dalla tabella sotto per messaggio/sessione focalizzata, salvo conferma esplicita dell’utente a unire due step.
2. **Non** modificare file o comportamenti degli step futuri prima che lo step corrente sia chiuso e verificato.
3. **Fine step:** sintesi breve (file toccati, come verificare con `pnpm build:admin`). **Poi fermati** e attendi «procedi con Step N+1» o correzioni.
4. Dubbio su schema/vincoli SQL: confronta sempre la migrazione `00020` e **`CAMPAIGNS_CONTRACT`**; non inventare colonne.
5. **Metriche KPI** sulle card (visite, click, funnel): fuori dagli step 1–4 salvo caricamento aggregato già disponibile — in v1 possono restare **zero** / placeholder finché `analytics_events` non è interrogato dall’admin (vedi contratto §5).

### Vincoli schema / UI riassuntivi

| DB / contratto | Implicazione |
|----------------|---------------|
| `creative_image_path` **NOT NULL** | In **INSERT** serve un path reale nel bucket Storage (preferibile) **oppure** decisione prodotti esplicita (es. migrazione ad hoc) documentata prima di proseguire. |
| `cid` UNIQUE + regex `^[A-Za-z0-9_-]{4,32}$` | Generazione lato UI con retry su conflitto; mostrare al marketer il `cid` definitivo dopo insert. |
| `base_url` deve match `^https?://` | Normalizzazione `trim` + validazione form. |
| `utm_campaign` NOT NULL | Obbligatorio nel builder come da contratto §3. |
| Stato **No dati \| Attiva \| Disattiva** | Solo da **`first_data_at` / `last_data_at`** (contratto §2, soglia 5 giorni) — non aggiungere colonna `status`. |
| `starts_at` | `timestamptz` in DB; allineare con ciò che oggi `CampagnePage` salva come `startsAt`. |

---

### Compiti — **sequenza fissa** (invoca **un solo** step per volta)

| Step | Contenuto | Verifica minima |
|------|------------|-----------------|
| **1** | Modulo **`campaigns-repository.ts`** (sotto `campagne/`): tipi row DB allineati a `00020`, funzioni `listCampaigns()` ordinamento sensato (`starts_at`/`last_data_at`), `insertCampaign(input)`, aggiornamento opzionale `patchCampaign`. Mapping snake_case ↔ tipo UI (**decidere**: riusare/estrarre tipo da `CampaignRecord` in `CampagnePage.tsx` vs modulo `types.ts` dedicato). Includere helper **`getCampaignLifecycle`** coerente con contratto §2. **Nessun** refactor ancora alla pagina grande. | `pnpm build:admin`; eventuale test unit su mapper puro / lifecycle. |
| **2** | **Storage creatività (E3 parziale):** bucket `campaign-previews` (o nome concordato) + policy **`authenticated`** upload/read come da [`CAMPAIGNS_CONTRACT` §6](CAMPAIGNS_CONTRACT.md) + [`supabase/README.md`](../supabase/README.md) pattern careers. Migrazione SQL **solo se** nel repo non esiste ancora il bucket/policy. Funzione helper admin: **`uploadCampaignCreative(file) -> path`** (path relativo salvato in `creative_image_path`). Se il bucket è già documentato ma non nel repo locale, aggiorna solo codice admin + README. | Upload smoke da admin o script; verifica file in bucket e path salvabile in INSERT di prova manuale. |
| **3** | **`CampagnePage`** — **lettura**: sostituire `useState(SEEDED_CAMPAIGNS)` con fetch da repository; skeleton + error + retry (`staff-pattern`). Anteprima immagine da **signed URL** o URL pubblico in base alla policy bucket. Rimozione o riduzione **seed demo** dopo conferma (opzionale: seed una tantum tramite SQL esterno fuori migrazioni business). | Lista campagne coincide con Table Editor Supabase dopo creazione manuale test. |
| **4** | **`NewCampaignBuilderCard` / creazione**: validazioni contratto §3; upload file→path (Step 2); **INSERT** con tutti i campi NOT NULL; gestione errore uniq `cid` (23505). Generazione **`cid`** (lunghezza/formato dentro il CHECK). Aggiorna URL copiabile coerente con il record persistito. | Nuova campagna sopravvive a reload e compare in DB; submit web con quel `cid` risolve `campaign_id` (smoke integrato facoltativo). |
| **5** | **`first_data_at` / `last_data_at`** ***(chiuso 2026-05-09, L6):*** aggiornamento server-side dalla Edge Function `analytics-ingest` via RPC `apply_campaign_event_timeline` (migrazione `20260509000010`, `LEAST/GREATEST`, preserva `campaigns_data_window_check`). Nessuna scrittura da admin. |
| **6** | **Metriche card** ***(chiuso v1 2026-05-09, L6):*** RPC `campaign_kpi_aggregates_v1` (migrazione `20260509000020`) → 5 conteggi base in `loadCampaignsForAdmin`. Card: KPI reali quando ci sono eventi, banner **"In attesa dati"** altrimenti. Voci avanzate (`candidates_created`, `avg_registration_seconds`, `conversioni per citta`, refactor dashboard admin) restano residual — vedi `PROMPT_CHAT_ANALYTICS_INGEST_SUPABASE.md`. |

L’operatore scrive sempre: **«Esegui Step N del prompt Campagne»** (N esplicito).

**Nota progetto:** con un **modello più potente** conviene affrontare lo Step 6 in una sessione dedicata (contesto ricco sullo schema **`analytics_events`**, volumetrie attese, trade-off fra **molte piccole letture REST** sul client versus **RPC / viste Postgres** consolidate).

### Non fare (salvo incarico separato)

- Cambiare **L1** / bridge `resolve_campaign_id_from_cid` salvo nuovo bug reale allineato a DB.
- Aggiungere colonna **`status`** su `campaigns`.
- Persistere KPI denormalizzati su `campaigns` al posto degli eventi (contratto usa eventi §5).

### Definition of done (MVP persistenza)

- Lista campagne in admin viene da **`public.campaigns`** dopo login `authenticated`.
- Creazione dal builder crea riga DB con **`creative_image_path`** valido e **`cid`** utilizzabile nel link pubblico.
- `pnpm build:admin` verde dopo gli step inclusi nell’implementazione dichiarata.
- Fuori dall’MVP corrente (pausa progetto): **Step 6** metriche KPI live finché non ripreso esplicitamente.

---

## Tracking

**Checkpoint 2026-05 (pausa prima Step 6):** aggiornati [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md), [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md), [`SMOKE_TEST_ADMIN.md`](SMOKE_TEST_ADMIN.md) § G, [`supabase/README.md`](../supabase/README.md).

Alla ripresa futura (Step 6 o ingest timeline): aggiorna di nuovo roadmap + note Dev + questo file.

---

## Nota operatore (modello)

Con **Composer 2 fast**, usare rigorosamente **uno step per chat**. Per step 2 (Storage + migrazioni) o incrocio **`NOT NULL`** + upload, **Composer 1.5** riduce rischi di tralasciamenti su policy SQL.
