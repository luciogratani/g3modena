# Campagne Contract (Admin + Web + DB)

Contratto operativo per passare dalla milestone UI al wiring reale su DB e `apps:web`.

## Obiettivo

Allineare in modo univoco:
- creazione campagna da admin;
- propagazione tracking (`cid` + UTM) nel link;
- aggiornamento stato campagna (`No dati | Attiva | Disattiva`);
- metriche mostrate nelle card admin.

---

## 1) Entita` `campaigns` (DB)

Tabella minima consigliata (`public.campaigns`):

| Campo | Tipo | Note |
|------|------|------|
| `id` | uuid pk | default `gen_random_uuid()` |
| `name` | text not null | titolo card admin |
| `subtitle` | text not null | descrizione breve card |
| `cid` | text not null unique | id tracking corto (8 char) |
| `base_url` | text not null | URL base landing |
| `utm_source` | text null | opzionale |
| `utm_medium` | text null | opzionale |
| `utm_campaign` | text not null | obbligatorio |
| `utm_term` | text null | opzionale |
| `utm_content` | text null | opzionale |
| `creative_image_path` | text not null | riferimento storage immagine |
| `starts_at` | timestamptz not null default now() | inizio campagna |
| `first_data_at` | timestamptz null | primo evento attribuito |
| `last_data_at` | timestamptz null | ultimo evento attribuito |
| `created_at` | timestamptz not null default now() | audit |
| `updated_at` | timestamptz not null default now() | audit |

Note:
- in v1 non persistere `status` come colonna;
- stato calcolato in query da `first_data_at` / `last_data_at`.
- strategia ID: `campaigns.id` (uuid) e` l'ID canonico interno; `cid` e` un token corto pubblico usato nei link.

---

## 2) Regola stato campagna (runtime)

Soglia inattivita`: **5 giorni**.

Formula:
- `No dati` => `first_data_at IS NULL`
- `Attiva` => `first_data_at IS NOT NULL` e `now() - last_data_at <= interval '5 days'`
- `Disattiva` => `first_data_at IS NOT NULL` e `now() - last_data_at > interval '5 days'`

Motivazione:
- il primo `page_view` con `cid` e` il segnale piu` precoce e stabile di utilizzo campagna;
- derivare lo stato in query evita job/cron prematuri e disallineamenti con gli eventi raw.

---

## 3) Contratto Admin -> Web (link builder)

L'admin genera URL:
- `base_url`
- query params UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`)
- `cid`

Esempio:

`https://g3modena.com/lavora-con-noi?utm_source=instagram&utm_medium=paid_social&utm_campaign=estate_modena_2026&utm_content=video_story_a&cid=a1b2c3d4`

Validazione builder (UI):
- obbligatori: `name`, `subtitle`, `creative_image`, `base_url`, `utm_campaign`;
- opzionali: `utm_source`, `utm_medium`, `utm_term`, `utm_content`;
- `cid` generato automaticamente.

---

## 4) Contratto Web -> Analytics/Candidates

Il client web, quando intercetta querystring con `cid`/UTM:
- propaga i campi a tutti gli eventi analytics rilevanti;
- include `cid` nel payload submit candidatura;
- risolve `cid -> campaigns.id` e persiste `campaign_id` (uuid) dove previsto (`candidates`, eventi ingest);
- mantiene UTM denormalizzati sul record candidatura.

Eventi minimi da attribuire a campagna:
- `page_view` (attiva `first_data_at` se null + aggiorna `last_data_at`)
- `cta_click` (aggiorna `last_data_at`)
- `careers_form_open` (aggiorna `last_data_at`)
- `careers_submit` (aggiorna `last_data_at`)
- `careers_abandon` (aggiorna `last_data_at`)

---

## 5) Mapping KPI card admin -> query

Per ogni campagna (`cid` o `campaign_id` se disponibile):

- Visite landing: count `event_type = 'page_view'`
- Click CTA: count `event_type = 'cta_click'`
- Aperture form: count `event_type = 'careers_form_open'`
- Submit candidature: count `event_type = 'careers_submit'`
- Candidature create: count su `candidates` attribuite a campagna
- Tasso conversione form: `careers_submit / careers_form_open`
- Tasso visita->conversione: `careers_submit / page_view`
- Abbandoni funnel: count `event_type = 'careers_abandon'`
- Tempo medio compilazione: avg `registration_duration_seconds` su candidature convertite
- Conversioni per citta`: `careers_submit` group by `city_slug`

---

## 6) Storage creativita`

- upload immagine da admin in bucket dedicato (es. `campaign-previews`);
- salvare in tabella solo `creative_image_path`/URL;
- immagine obbligatoria in creazione campagna;
- in v1 editing immagine disabilitato (sola preview in card).

---

## 7) Roadmap wiring (sintesi)

1. Migrazione `campaigns` + vincoli univoci (`cid`, opzionale `slug/utm_campaign`).
2. Endpoint/repository admin per create/list campaigns.
3. Upload storage preview + salvataggio `creative_image_path`.
4. Ingest web eventi con `cid` e update `first_data_at`/`last_data_at`.
5. Query KPI card + stato runtime.

