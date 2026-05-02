# Data layer & Supabase (monorepo)

Documento tecnico per chat/agent durante:

- collegamento reale a Supabase (DB + Storage)
- sviluppo sezione admin e passaggio da dati locali a backend condiviso
- passaggio da contenuti hardcoded / locali a CMS lato `web`

**Contenuto:** in fondo resta il **piano dati admin** per le aree ancora su persistenza locale o non production-safe. **Aggiornamento 2026-05:** molte integrazioni Supabase sono **già attive** (città REST anon, receiver candidature/contatti via Edge, board `candidates`, inbox `contact_messages`, Auth admin, storage allegati careers). Questo file descrive ancora **contratti e gap** (es. contenuti sito da `site-content` vs DB CMS, camerieri/campagne locali, residuo E3 media CMS).

---

## Parte Web — stato attuale e contratto CMS

### 1) Stato attuale certo (web)

- App `web` è una SPA React/Vite.
- I contenuti pagina sono locali in `web/data/site-content.ts`.
- Il rendering usa `siteContent` direttamente in `web/src/App.tsx`.
- Esiste già un adapter pronto per DB in `web/lib/content-adapter.ts`:
  - `adaptSiteContent(rows)` normalizza e valida i dati
  - `loadSiteContent({ tenantSchema, fetchSections })` ha fallback a contenuti locali
- Form pubblici usano endpoint HTTP esterni:
  - `VITE_CONTACT_ENDPOINT`
  - `VITE_CAREER_ENDPOINT`
- Lo step **«Scegli la sede»** del form candidature legge **`public.cities`** via **REST Postgres** anon (`fetch` verso `{VITE_SUPABASE_URL}/rest/v1/cities`, header `apikey` + `Authorization` bearer anon) — vedi `web/data/application-office-cities.ts`; **non** c’è dipendenza da `@supabase/supabase-js` nel package `web`.
- Al momento `web` **non** usa il **client JS** `@supabase/supabase-js`; usa comunque progetto/host Supabase (REST + Functions) quando le env sono configurate.

Nota: `admin/src/lib/supabase.ts` usa lo stesso host con sessione **`authenticated`**; la `web` resta SPA separata senza quel client ma può parlare allo stesso backend in anonimo dove previsto da RLS.

---

### 2) Contratto contenuti web (source of truth UI)

Il modello tipizzato è in `web/data/site-content.ts` (`SiteContent`):

- `hero`
- `about`
- `clients`
- `whyG3`
- `footer`
- `seo` (`metaTitle`, `metaDescription`, canonical/OG/robots)
- `sections` (`contactForm.enabled`, `careersForm.enabled`)

Quando il CMS fornisce dati, la forma finale deve restare compatibile con `SiteContent`.

---

### 3) Section keys supportate dal parser web

`adaptSiteContent()` accetta le seguenti chiavi sezione:

- `hero`
- `about`
- `clients`
- `why_g3` (oppure `whyG3`)
- `footer`
- `seo`
- `sections`
  - supporta anche alias:
    - `contactForm` o `contact_form`
    - `careersForm` o `careers_form`

Regola pratica: nel DB/CMS mantenere una convention stabile (consigliata snake_case lato tabella, con mapping esplicito).

---

### 4) Strategia consigliata per DB contenuti sito (Supabase)

#### Obiettivo minimo

Consentire a `web` di leggere contenuti per tenant con fallback locale.

#### Schema logico consigliato (proposta)

Tabella contenuti sezioni (nome operativo previsto: `cms_sections`, default già usato da `admin/src/lib/supabase.ts`):

- `tenant_schema` (text) oppure `tenant_id` (uuid/text)
- `section_key` (text)
- `content` (jsonb)
- `is_published` (bool)
- `updated_at` (timestamp)

Vincoli minimi:

- unique (`tenant_schema`, `section_key`)
- check su `section_key` (set limitato)

Chiavi `section_key` v1:

- sezioni editoriali da `@g3/content-contract`: `hero`, `about`, `clients`, `why_g3`, `footer`, `sections`;
- `seo` come riga speciale nella stessa tabella CMS. Per ora resta fuori da `CMS_SECTION_KEYS` perché il codice SEO admin/web la gestisce come configurazione globale, non come sezione editoriale principale.

Nota implementativa admin: se `VITE_TENANT_SCHEMA` è configurato, gli upsert usano conflict target `tenant_schema,section_key`; senza tenant, l’admin usa `section_key` come chiave unica globale.

---

### 5) Strategia consigliata per Storage (Supabase)

Per produzione media avanzata: attivare quando serve workflow reale di upload.

Quando servirà:

- bucket separati per tipo contenuto (es. `site-media` per media CMS, `campaign-previews` per immagini campagne, `careers-cv` / `careers-photos` per candidature)
- naming file con prefisso tenant e data (`tenant/...`)
- policy RLS/storage con permessi minimi:
  - pubblico read solo dove necessario (es. hero image/video pubblici)
  - upload candidati controllato (idealmente signed upload)

Decisione v1 candidature: non introdurre una tabella attachment dedicata; salvare path diretti su `candidates` (`profile_photo_path`, `cv_path`) per ridurre complessità iniziale.

---

### 6) Contratto Admin → Web (CMS)

Admin deve produrre dati compatibili con `SiteContent` + section keys supportate.

Checklist per ogni sezione:

- campi obbligatori presenti
- tipi corretti (string, array, boolean)
- enum validi (es. `whyG3.icon`: `clock|crown|users|shield-check`)
- URL/href coerenti

Se un campo manca o è invalido, il web adapter usa fallback locale (comportamento voluto).

---

### 7) Payload form pubblici da preservare nel backend

#### Contact form

`web/components/contact-form.tsx` invia JSON a `VITE_CONTACT_ENDPOINT`:

- `fullName`, `company`, `email`, `phone`, `city`, `message`.

La tabella DB prevista è `contact_messages`, con questi campi più metadati admin: `status` (`nuovo` / `letto` / `archiviato`), `created_at`, `source = 'web_contact_form'`, ed eventuale `session_id` per correlazione analytics senza duplicare PII negli eventi.

#### Careers form

`web/components/careers-form.tsx` invia a `VITE_CAREER_ENDPOINT` in due modalità:

- JSON default: campi scalari + `profilePhotoFileName`, `profilePhotoDataUrl`, `cvFileName`, `cvPreviewUrl`, `privacyConsentAccepted`.
- Multipart se `VITE_CAREER_SUBMIT_FORMAT = 'multipart'`: stessi campi logici, file `profilePhoto` e `cv`, `languages` serializzato JSON.

Il backend Supabase/Edge dovrà normalizzare verso `candidates`: split `fullName` se si mantengono colonne `first_name` / `last_name`, mapping città verso `city_id`, path Storage diretti per foto/CV e campi workflow admin (`pipeline_stage`, note, appuntamenti) inizializzati in modo coerente con la board.

---

### 8) Piano collegamento reale web (sequenza sicura)

1. Tenere `web` in fallback locale (stato attuale).
2. Collegare prima `admin` a Supabase per CRUD contenuti.
3. Popolare sezioni base (`hero/about/clients/why_g3/footer/seo/sections`) per un tenant.
4. Integrare `web` con `loadSiteContent()` usando `fetchSections`.
5. Abilitare feature flag per switch locale/DB.
6. Solo dopo: collegare upload media/storage reali.

---

### 9) Env vars attese

#### Web (attuali)

- `VITE_CONTACT_ENDPOINT`
- `VITE_CAREER_ENDPOINT`
- `VITE_CAREER_SUBMIT_FORMAT` (opzionale: `multipart` abilita invio file come `FormData`)

#### Web (future, quando si collega Supabase)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TENANT_SCHEMA` (oppure `VITE_TENANT_ID`)

#### Admin (già previste)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_CMS_TABLE` (opzionale; default codice: `cms_sections`)
- `VITE_TENANT_SCHEMA` (opzionale; abilita filtro/upsert per tenant)
- `VITE_SUPABASE_MEDIA_BUCKET` (opzionale; default codice: `site-media`)

---

### 10) Regole per chat/agent — ambito CMS web

Quando una chat lavora su DB/CMS:

- non rimuovere fallback locale in `site-content.ts` finché il backend non è stabile
- non cambiare i nomi sezione senza aggiornare `content-adapter.ts`
- non introdurre nuovi enum/icona senza aggiornare validazione adapter
- mantenere backward compatibility (alias chiavi già supportati)
- validare sempre build web dopo modifiche a modello contenuti

---

### 11) File chiave — CMS web

- `web/data/site-content.ts`
- `web/lib/content-adapter.ts`
- `web/src/App.tsx`
- `web/components/careers-form.tsx`
- `admin/src/lib/supabase.ts`

---

## Parte Admin — pianificazione persistenza (pre-wiring)

Questa sezione descrive la **direzione concordata** per il modello dati su Supabase **prima** dell’implementazione degli adapter che sostituiranno `localStorage` dove previsto. Non sostituisce il tracking operativo giornaliero in [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md).

### 12) Domini tabellari previsti

| Dominio | Decisione |
|--------|-----------|
| **Città / sedi** | Tabella `cities` come source of truth: `id` uuid PK, `slug` stabile (`modena`, `sassari`), `display_name`, `is_active`, `sort_order`. Il vecchio concetto `city_code` corrisponde a `cities.slug`, ma le tabelle operative usano `city_id` FK. |
| **Candidati (board)** | **Una tabella** `candidates` con `city_id` FK, campi form web, path diretti foto/CV, `campaign_id` nullable, UTM e campo workflow espandibile (`pipeline_stage`). Separazione per sede tramite RLS/indici su `city_id`, non tabelle gemelle. |
| **Staff (ex Camerieri CRM)** | **Una tabella** `staff` con `city_id` FK e `source_candidate_id` nullable per idempotenza promozione da candidato. Naming DB scelto: `staff`; la UI può continuare a parlare di “Camerieri”. |
| **Web editor (sezioni sito)** | **Tabella unica** `cms_sections` righe-per-sezione: `tenant_schema` + `section_key` + `content` jsonb + metadati pubblicazione/versione se necessari. |
| **SEO** | Stessa tabella `cms_sections` con `section_key = 'seo'`; nessuna tabella dedicata in v1. |
| **Messaggi contatti** | **Tabella dedicata** `contact_messages` con payload del form contatti, stato `nuovo` / `letto` / `archiviato`, timestamp, `source` ed eventuale `session_id`. |
| **Impostazioni UI admin** | Restano in **`localStorage`** (tema, preferenze layout, filtri solo locali). Non sostituire con DB ciò che è puramente client e non richiede sync multi-dispositivo o audit. |

**Storage (Supabase Storage):** resta come da §5 per media e allegati secondo policy RLS. In v1 gli allegati candidatura sono path diretti su `candidates`, non una tabella separata.

---

### 13) Overview / dashboard

- **Non** è obbligatoria una tabella dedicata “overview” all’inizio.
- Preferenza: **aggregazioni on read** (query o **view** SQL) su messaggi, candidati per stato/fase, conteggi per `city_id`/`cities.slug`, con indici sulle colonne filtrate.
- Valutare tabella (o materialized view + refresh) di **snapshot** solo se servono storico KPI, report pesanti o confronti nel tempo.

---

### 14) Sequenza prima del go-live dati

1. **Completare l’ultima vista** prevista in admin (milestone UI — dettaglio in `DEVELOPMENT_NOTES` o issue dedicata).
2. Definire **schema SQL** su Supabase (tabelle sopra), **RLS** e ruoli coerenti con `city_id` / tenant.
3. Implementare **adapter** admin (load/save) con normalizzazione e fallback, poi **migrazione** dai blob `localStorage` dove applicabile.
4. In parallelo o dopo: seguire il §8 per il **filamento web ↔ CMS** se il contenuto pubblico deve leggere dal DB.

Dettaglio concettuale su **campagne**, **analytics event-driven**, **tabella `cities`** e bozza **RLS**: [`PRE_WIRING_CONCEPT.md`](PRE_WIRING_CONCEPT.md).

---

Aggiornare questo documento quando cambiano contratto CMS web (`SiteContent` / adapter), chiavi sezione, o il modello dati admin pianificato sopra.
