# Supabase — schema v1 (D1 + E1 + E2b)

Migrazioni SQL versionate per il progetto Supabase di **G3 Modena**.

> **Vincolo hard:** queste migrazioni sono **schema-only**. Non contengono
> dati di business, demo o di test (`INSERT ... values (...)`). Le righe
> reali entreranno dal cliente via UI admin (E4) o, se necessario, via
> import puntuale fuori dal repo.

Riferimenti:
- [`docs/IMPLEMENTATION_ROADMAP.md`](../docs/IMPLEMENTATION_ROADMAP.md) — fasi D1/E1/E2.
- [`docs/PRE_WIRING_CONCEPT.md`](../docs/PRE_WIRING_CONCEPT.md) — ERD concettuale v1.
- [`docs/CAMPAIGNS_CONTRACT.md`](../docs/CAMPAIGNS_CONTRACT.md) — contratto `campaigns`.
- [`docs/ANALYTICS_INGEST_CONTRACT.md`](../docs/ANALYTICS_INGEST_CONTRACT.md) — contratto `analytics_events`.
- [`docs/DB_CMS_INTEGRATION.md`](../docs/DB_CMS_INTEGRATION.md) — piano dati CMS/admin.

## Struttura

```
supabase/
└── migrations/
    ├── 20260501000000_init_extensions_and_helpers.sql   pgcrypto + trigger updated_at
    ├── 20260501000010_create_cities.sql                 sedi (source of truth)
    ├── 20260501000020_create_campaigns.sql              campagne (cid UNIQUE, no status persistito)
    ├── 20260501000030_create_candidates.sql             form careers + workflow board
    ├── 20260501000040_create_staff.sql                  ex Camerieri (FK city + opt source_candidate)
    ├── 20260501000050_create_cms_sections.sql           contenuti CMS + seo
    ├── 20260501000060_create_contact_messages.sql       inbox /contact
    ├── 20260501000070_create_analytics_events.sql       eventi append-only
    ├── 20260501000080_alter_candidates_discard.sql      A4: stato scartati + discard_*
    ├── 20260501000090_e2b_enable_rls.sql                enable/force RLS
    ├── 20260501000100_e2b_policies_authenticated_admin.sql
    ├── 20260501000110_e2b_policies_anon_public.sql
    ├── 20260501000120_e2b_campaign_lookup_bridge.sql    RPC cid -> campaign_id
    ├── 20260501000130_e2b_hardening_grants_and_policy_smoke.sql
    ├── 20260501000140_e3_storage_careers.sql            bucket allegati candidature
    └── 20260501000150_e4_candidates_admin_workflow.sql  E4/L5: admin_workflow jsonb + kanban_rank numeric
└── functions/
    ├── contact-submissions/                             receiver form contatti
    └── career-submissions/                              receiver candidature web
```

L'ordine numerico riflette l'ordine consigliato in
`docs/PRE_WIRING_CONCEPT.md` § "Ordine suggerito migrazioni". Le tabelle che
referenziano altre (FK) vengono create dopo le tabelle puntate.

## Applicazione

Le migrazioni sono compatibili con **Supabase CLI**. Dopo il primo
`supabase init` / `supabase link` nel repo:

```bash
supabase db push
```

Per workflow remoto (senza Docker locale), usare:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

> Nota: il file `supabase/config.toml` non è committato qui per evitare di
> fissare un `project_id` specifico. Dopo `supabase link --project-ref <ref>`
> il file viene rigenerato in locale.

### Deploy receiver candidature (L1)

Il receiver `career-submissions` è una Supabase Edge Function server-side:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
supabase secrets set CAREERS_ALLOWED_ORIGINS=https://g3modena.com
supabase functions deploy career-submissions
```

Env web production:

```bash
VITE_CAREER_ENDPOINT=https://<project-ref>.functions.supabase.co/career-submissions
VITE_CAREER_SUBMIT_FORMAT=multipart
```

Il gateway delle Functions richiede anche **`Authorization: Bearer <anon>`** e **`apikey`** (stessa anon key pubblica): il sito (`careers-form.tsx`, `contact-form.tsx`) li invia tramite `web/lib/supabase-edge-invoke-headers.ts`. Negli smoke `curl` usa `-H "Authorization: Bearer $SUPABASE_ANON_KEY" -H "apikey: $SUPABASE_ANON_KEY"`.

Prerequisiti operativi:

1. `supabase db push` deve aver applicato anche `20260501000140_e3_storage_careers.sql`;
2. `public.cities` deve contenere righe attive per gli slug inviati dal sito (es. `modena`, `sassari`);
3. `SUPABASE_SERVICE_ROLE_KEY` deve restare solo nei secrets della Function, mai in env Vite/client.

Smoke manuale multipart:

```bash
curl -i -X POST "$VITE_CAREER_ENDPOINT" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -F officeCitySlug=modena \
  -F fullName="Mario Rossi" \
  -F email="mario.rossi@example.com" \
  -F phone="+393331234567" \
  -F age=24 \
  -F city=Modena \
  -F availability=Immediata \
  -F educationLevel=Liceo \
  -F isAwayStudent=no \
  -F 'languages=["Italiano","Inglese"]' \
  -F hasDriverLicense=yes \
  -F plansNextTwoYears="" \
  -F jobAttraction="Mi interessa lavorare negli eventi." \
  -F hasRelevantExperience=no \
  -F privacyConsentAccepted=true \
  -F profilePhoto=@/path/to/photo.jpg \
  -F cv=@/path/to/cv.pdf
```

### Deploy receiver contatti (L2)

Il receiver `contact-submissions` riceve JSON dal form pubblico e inserisce
solo righe `source = 'web_contact_form'` / `status = 'nuovo'` in
`public.contact_messages`.

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
supabase secrets set CONTACT_ALLOWED_ORIGINS=https://g3modena.com
supabase functions deploy contact-submissions
```

Env web production:

```bash
VITE_CONTACT_ENDPOINT=https://<project-ref>.functions.supabase.co/contact-submissions
```

Serve anche la anon key pubblica nel bundle (`VITE_SUPABASE_ANON_KEY`) per gli header verso il gateway Functions (vedi sopra).

Smoke manuale JSON:

```bash
curl -i -X POST "$VITE_CONTACT_ENDPOINT" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Mario Rossi",
    "company": "Rossi Eventi",
    "email": "mario.rossi@example.com",
    "phone": "+393331234567",
    "city": "Modena",
    "message": "Vorrei informazioni per un evento aziendale."
  }'
```

### Verifica migrazioni E2b su progetto remoto pulito

Check consigliati (manuali, post-`db push`):

1. verificare ordine migration applicato (`20260501000000` → `20260501000130`);
2. eseguire smoke allow/deny dal file:
   - `supabase/sql/e2c_rls_smoke_allow_deny.sql`
3. verificare presenza policy da `pg_policies` per tutte le tabelle target;
4. verificare che `resolve_campaign_id_from_cid(text)` sia `EXECUTE` per `anon`.

Se non vuoi usare CLI, lo stesso smoke pack è incollabile nel SQL Editor Supabase.

### Board admin v1 (E4/L5)

Migrazione `20260501000150_e4_candidates_admin_workflow.sql`:

- `admin_workflow jsonb` (default `'{}'::jsonb`) — snapshot UI workflow non
  normalizzato (note, interview/training/postpone metadata, sub-lane id,
  score, referral source, profile image override). Shape gestita app-side
  dal repository `candidates-repository.ts`, niente CHECK in v1.
- `kanban_rank numeric` not null — posizione card dentro lo scope
  `(city_id, pipeline_stage)`. Strategia **midpoint float**:
  - drop tra due card: `rank = (prev + next) / 2`;
  - append in coda: `rank = max(rank in scope) + 1000`;
  - prima card della colonna: `rank = 1000`.
  Vantaggi: un solo `UPDATE` per drag-and-drop (niente rewrite di N righe),
  ORDER BY server-side, indice composito query-friendly.
- Indice `candidates_city_stage_rank_idx (city_id, pipeline_stage, kanban_rank)`
  per il pattern di lettura della board.

Receiver `career-submissions` (L1) calcola `kanban_rank` come
`max(rank colonna 'nuovo' della sede) + 1000` all'INSERT.

Smoke SQL post `db push`:

```sql
-- Verificare backfill: nessuna riga con kanban_rank null
select count(*) from public.candidates where kanban_rank is null;

-- Verificare unicità ordinamento per scope
select city_id, pipeline_stage, count(*) filter (where kanban_rank is not null) as ranked
from public.candidates
group by city_id, pipeline_stage
order by city_id, pipeline_stage;
```

## Convenzioni schema

| Aspetto | Decisione |
|---------|-----------|
| **PK entità** | `uuid` con `default gen_random_uuid()` (richiede `pgcrypto`). |
| **PK eventi** | `bigint generated by default as identity` (alta cardinalità, append-only). |
| **Naming** | `snake_case` per colonne; tabelle al plurale; vincoli con prefisso `<table>_<scope>_check / _unique / _idx`. |
| **Timestamps** | `timestamptz` con default `now()`; `updated_at` mantenuto da trigger generico (`public.set_updated_at_timestamp`). |
| **Enum** | `CHECK (col in (...))` invece di tipi `enum` Postgres → più facile estendere senza migrazione di tipo. |
| **FK** | `ON DELETE RESTRICT` dove la perdita rompe storico (city → candidates/staff); `ON DELETE SET NULL` dove il record figlio sopravvive (campaign → candidates / analytics_events; candidate → staff). |
| **JSONB** | Solo dove serve documento opaco (`cms_sections.content`); altrove colonne tipizzate. |
| **Idempotenza file** | `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`. |

## Cosa NON è incluso (per design)

- **Seed di business**: nessuna città, campagna, candidato, messaggio o
  evento analytics. Anche `cities` (Modena/Sassari) resta vuota: il seed
  reale arriva via admin in E4 o via INSERT del cliente.
- **Storage residuo**: `careers-photos` e `careers-cv` sono creati per L1 in
  `20260501000140`; restano fuori `site-media`, `campaign-previews` e le policy
  avanzate per media CMS/campagne.
- **Funzioni Edge / triggers di business residui** (es. update di
  `first_data_at` / `last_data_at` su campaigns dagli ingest): da definire
  quando si collegano gli adapter (E4) e l'ingest reale. L1 introduce solo
  `career-submissions`; L2 introduce `contact-submissions`.

## Mapping colonne ↔ codice client

| Tabella | Mapping principale (codice → DB) |
|---------|----------------------------------|
| `cities` | `admin/src/components/cities/types.ts` (`OfficeCity`) → `id`, `slug`, `display_name`, `is_active`, `sort_order`. |
| `campaigns` | `admin/src/components/campagne/CampagnePage.tsx` (`CampaignRecord`) + `docs/CAMPAIGNS_CONTRACT.md`. |
| `candidates` | `web/components/careers-form.tsx` payload (`buildCareerJsonPayload`) + workflow board admin (`admin/src/components/candidati-board/candidates-repository.ts`: `pipeline_stage`, `kanban_rank` numeric, `discard_*` canoniche, `admin_workflow jsonb` con notes/interview/training/postpone). |
| `staff` | `admin/src/components/camerieri/types.ts` (`Cameriere`). |
| `cms_sections` | `web/lib/content-adapter.ts` (`adaptSiteContent`) + `@g3/content-contract`. |
| `contact_messages` | `admin/src/components/contact-messages/types.ts` (`ContactMessage`). |
| `analytics_events` | `web/lib/analytics-ingest.ts` (`AnalyticsIngestEventPayload`) + contratto v1. |

## Mismatch risolti rispetto all'ERD concettuale

L'ERD in `PRE_WIRING_CONCEPT.md` § *ERD minimo* è bozza pre-schema. Differenze
allineate qui (fonte autoritativa: i contratti dedicati):

1. **`campaigns`** — niente `slug` né `status` né `ends_at`; chiave pubblica
   è `cid` UNIQUE. Stato derivato a runtime (CAMPAIGNS_CONTRACT §2).
2. **`candidates.languages`** — passa da `text` a `text[]` (il payload web
   trasporta un array; serializzato JSON solo in modalità multipart).
3. **`analytics_events`** — aggiunti `client_event_id` (idempotenza retry,
   UNIQUE parziale) e `received_at` (debug clock skew). Vincoli CHECK
   minimali per coerenza payload (`cta_click` richiede `cta_key`,
   `careers_step_view` / `careers_abandon` richiedono `form_step_index`).
4. **`contact_messages`** — aggiunto `updated_at` per allinearlo al
   workflow `nuovo|letto|archiviato`.
5. **`cms_sections`** — UNIQUE composito gestisce `tenant_schema` NULL via
   `NULLS NOT DISTINCT` (Postgres 15+).

## Prossimi step (E2 → E5)

1. **E2 completato (E2b baseline)**: RLS + policy + grants minimi implementati
   in `20260501000090`…`20260501000130`.
2. **E3 — Storage**: bucket candidature (`careers-photos`, `careers-cv`) già
   creati per L1; restano media CMS/campagne.
3. **E4 — Adapter admin**: `contact_messages` (L2), `cities` e **board `candidates`**
   (gate **L5**, migrazione `0150` con `admin_workflow jsonb` + `kanban_rank numeric`)
   sono collegati a Supabase; restano staff, campaigns e CMS dove applicabile.
4. **E5 — Auth + guard route**.

## RLS matrix v1 (E2b)

| Tabella | anon | authenticated |
|---------|------|---------------|
| `cities` | `SELECT` solo `is_active = true` | full CRUD |
| `campaigns` | nessun accesso diretto | full CRUD |
| `candidates` | `INSERT` only (guardrail submit pubblico) | full CRUD |
| `staff` | nessun accesso | full CRUD |
| `cms_sections` | `SELECT` solo `is_published = true` (+ tenant match se claim) | full CRUD |
| `contact_messages` | `INSERT` only (`source='web_contact_form'`, `status='nuovo'`) | full CRUD |
| `analytics_events` | `INSERT` only append-only | full CRUD |

Note hardening:
- `campaigns` non è leggibile da `anon`; il lookup pubblico passa da
  `public.resolve_campaign_id_from_cid(text)` (security definer).
- Per `anon` sono stati aggiunti `GRANT` minimi (tabella + sequence identity
  `analytics_events_id_seq`).
- `FORCE RLS` attivo su `campaigns`, `candidates`, `staff`,
  `contact_messages`, `analytics_events`.

## Auth admin required (E5 baseline)

Con RLS E2b attiva, il backoffice legge/scrive dati operativi solo in sessione
Supabase Auth valida (`role = authenticated`).

Comportamento app admin:

1. se sessione assente: mostra schermata login;
2. dopo login (`signInWithPassword`): route admin accessibili con policy `authenticated`;
3. logout (`signOut`): ritorno immediato alla schermata login;
4. config mancante (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`): schermata misconfigured.

## Cosa resta anon-only sul web

Ruolo `anon` (pubblico) mantiene solo la superficie minima:

- `SELECT` su `cities` (`is_active = true`);
- `SELECT` su `cms_sections` pubblicate (con tenant match se claim presente);
- `INSERT` su `candidates` (submit careers) con guardrail policy;
- `INSERT` su `contact_messages` (submit contatti) con `source/status` vincolati;
- `INSERT` su `analytics_events` append-only;
- nessun `SELECT` diretto su `campaigns` (solo bridge RPC `resolve_campaign_id_from_cid`).

## Boundary anti-spam (design-level)

RLS riduce la superficie ma **non sostituisce** rate-limit/validazione.
Per i receiver pubblici (`careers`, `contact`, `analytics ingest`) mantenere:

1. endpoint Edge/API con throttle IP + fingerprint sessione;
2. validazione payload applicativa prima dell'insert;
3. dedup eventi via `client_event_id` (già supportato da unique partial index);
4. CAPTCHA/challenge dove necessario (soprattutto form contatti/candidature).
