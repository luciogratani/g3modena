-- =========================================================================
-- 0030 — candidates
--
-- Una sola tabella per board admin + submit form web (PRE_WIRING_CONCEPT §4,
-- DB_CMS_INTEGRATION §12).
--
-- Decisioni:
--   • full_name testo unico (mappa diretta del payload web careers `fullName`).
--     Se in futuro servirà split first/last si farà con view/colonne calcolate.
--   • languages text[] (il form invia un array; in multipart è serializzato
--     JSON ma normalizzato a array nel receiver).
--   • Allegati v1 come path diretti (profile_photo_path, cv_path) — niente
--     tabella attachment dedicata (DB_CMS_INTEGRATION §5).
--   • UTM denormalizzati al submit (Policy 3 ibrida); `campaign_id` FK
--     nullable risolta da `cid`.
--   • pipeline_stage controllato da CHECK con set v1 mutuato dalla board admin
--     (admin/src/data/mockCandidates.ts → CandidateStatus).
--   • Default `pipeline_stage = 'nuovo'` per allineare al kanban.
--
-- Mismatch risolto vs PRE_WIRING_CONCEPT §ERD: ERD descriveva `languages text`
-- ma il payload web è array; qui passiamo a text[]. Resta append-only il
-- collegamento web→DB; eventuali sub-strutture (allegati multipli) restano
-- fuori dalla v1.
-- =========================================================================

create table if not exists public.candidates (
  id                              uuid primary key default gen_random_uuid(),
  city_id                         uuid not null
                                    references public.cities (id) on delete restrict,
  campaign_id                     uuid
                                    references public.campaigns (id) on delete set null,

  -- anagrafica & contatti (form web)
  full_name                       text not null,
  email                           text not null,
  phone                           text not null,
  age                             smallint,
  residence_city                  text not null,
  availability                    text not null,

  -- profilo / qualifiche
  education_level                 text not null,
  is_away_student                 boolean not null,
  languages                       text[] not null default '{}'::text[],
  has_driver_license              boolean not null,
  has_relevant_experience         boolean not null,

  -- testo libero motivazionale
  plans_next_two_years            text,
  job_attraction                  text,

  -- allegati come path Storage (E3 definirà bucket/policy)
  profile_photo_path              text,
  cv_path                         text,

  -- consenso privacy (obbligatorio per submit valido)
  privacy_consent_accepted        boolean not null default false,

  -- workflow admin board (coperto dal kanban)
  pipeline_stage                  text not null default 'nuovo',

  -- attribution denormalizzata (UTM congelati al submit)
  utm_source                      text,
  utm_medium                      text,
  utm_campaign                    text,
  utm_term                        text,
  utm_content                     text,

  -- funnel
  registration_duration_seconds   integer,

  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),

  constraint candidates_full_name_length_check
    check (char_length(btrim(full_name)) between 2 and 100),
  constraint candidates_email_format_check
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint candidates_phone_length_check
    check (char_length(btrim(phone)) between 4 and 40),
  constraint candidates_age_range_check
    check (age is null or age between 14 and 120),
  constraint candidates_residence_city_length_check
    check (char_length(btrim(residence_city)) between 2 and 80),
  constraint candidates_availability_length_check
    check (char_length(btrim(availability)) between 1 and 120),
  constraint candidates_education_level_length_check
    check (char_length(btrim(education_level)) between 1 and 120),
  constraint candidates_languages_size_check
    check (cardinality(languages) <= 16),
  constraint candidates_pipeline_stage_check
    check (pipeline_stage in ('nuovo','colloquio','formazione','in_attesa','rimandati','archivio')),
  constraint candidates_registration_duration_check
    check (
      registration_duration_seconds is null
      or registration_duration_seconds between 0 and 86400
    )
);

comment on table public.candidates is
  'Candidati ricevuti dal form web /careers; arricchiti dal workflow board admin.';
comment on column public.candidates.city_id is
  'Sede di candidatura (FK a cities.id). Lo slug città resta consultabile via JOIN o denormalizzato negli analytics_events.';
comment on column public.candidates.languages is
  'Lingue dichiarate dal candidato (array text). v1 senza vocabolario controllato.';
comment on column public.candidates.profile_photo_path is
  'Path Storage relativo (bucket careers-photos in E3).';
comment on column public.candidates.cv_path is
  'Path Storage relativo (bucket careers-cv in E3).';
comment on column public.candidates.pipeline_stage is
  'Colonna kanban corrente; set v1: nuovo|colloquio|formazione|in_attesa|rimandati|archivio.';
comment on column public.candidates.registration_duration_seconds is
  'Durata compilazione form (apertura → submit). NULL se non misurabile.';

create index if not exists candidates_city_pipeline_idx
  on public.candidates (city_id, pipeline_stage);
create index if not exists candidates_created_at_idx
  on public.candidates (created_at desc);
create index if not exists candidates_campaign_id_idx
  on public.candidates (campaign_id) where campaign_id is not null;
create index if not exists candidates_email_idx
  on public.candidates (lower(email));

drop trigger if exists candidates_set_updated_at on public.candidates;
create trigger candidates_set_updated_at
  before update on public.candidates
  for each row execute function public.set_updated_at_timestamp();
