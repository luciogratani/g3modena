-- =========================================================================
-- E2c Smoke Pack — RLS allow/deny (copy-paste)
--
-- Uso previsto:
-- 1) applica migrazioni in ordine (remote): supabase db push
-- 2) apri SQL Editor (Supabase) e incolla blocchi separatamente
-- 3) verifica output allow/deny atteso
--
-- Nota: non inserisce seed/mock dati business.
-- =========================================================================

-- -------------------------------------------------------------------------
-- [A] Precheck schema/policy presenti
-- -------------------------------------------------------------------------
select to_regclass('public.cities') as cities_table;
select to_regclass('public.campaigns') as campaigns_table;
select to_regclass('public.candidates') as candidates_table;
select to_regclass('public.staff') as staff_table;
select to_regclass('public.cms_sections') as cms_sections_table;
select to_regclass('public.contact_messages') as contact_messages_table;
select to_regclass('public.analytics_events') as analytics_events_table;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'cities',
    'campaigns',
    'candidates',
    'staff',
    'cms_sections',
    'contact_messages',
    'analytics_events'
  )
order by tablename, policyname;

-- -------------------------------------------------------------------------
-- [B] Test ruolo anon — ALLOW attesi
-- -------------------------------------------------------------------------
set local role anon;

-- B1: anon può leggere cities attive (0+ righe).
select id, slug, is_active
from public.cities
order by sort_order, slug
limit 50;

-- B2: anon può leggere cms_sections pubblicate (0+ righe).
select id, tenant_schema, section_key, is_published
from public.cms_sections
order by section_key
limit 50;

-- B3: anon può usare bridge cid -> campaign_id.
-- (può restituire NULL se cid non esiste, ma non deve fallire per permessi)
select public.resolve_campaign_id_from_cid('examplecid123') as campaign_id;

reset role;

-- -------------------------------------------------------------------------
-- [C] Test ruolo anon — DENY attesi
-- -------------------------------------------------------------------------
set local role anon;

-- C1: SELECT su tabella PII candidates deve fallire.
-- expected: ERROR: permission denied for table candidates
select * from public.candidates limit 1;

-- C2: SELECT su campaigns deve fallire.
-- expected: ERROR: permission denied for table campaigns
select * from public.campaigns limit 1;

-- C3: UPDATE analytics_events deve fallire (anon insert-only).
-- expected: ERROR: permission denied for table analytics_events
update public.analytics_events
set city_slug = 'modena'
where false;

reset role;

-- -------------------------------------------------------------------------
-- [D] Test ruolo authenticated — ALLOW baseline atteso
-- -------------------------------------------------------------------------
set local role authenticated;

-- D1: read candidates ok.
select count(*) as candidates_count from public.candidates;

-- D2: update contact_messages ok.
update public.contact_messages
set status = 'letto'
where false;

-- D3: read campaigns ok.
select count(*) as campaigns_count from public.campaigns;

reset role;

-- -------------------------------------------------------------------------
-- [E] Test insert anon controllati (senza seed business)
-- -------------------------------------------------------------------------
-- E1: candidates insert anon dovrebbe fallire se city_id non valida / privacy false.
-- expected: violazione policy/check.
set local role anon;
insert into public.candidates (
  city_id,
  full_name,
  email,
  phone,
  residence_city,
  availability,
  education_level,
  is_away_student,
  has_driver_license,
  has_relevant_experience,
  privacy_consent_accepted,
  pipeline_stage
) values (
  '00000000-0000-0000-0000-000000000000',
  'Test Candidate',
  'test@example.com',
  '+390000000000',
  'Modena',
  'Immediata',
  'Diploma',
  false,
  true,
  false,
  false,
  'nuovo'
);
reset role;

-- E2: contact_messages insert anon con status diverso da nuovo deve fallire.
set local role anon;
insert into public.contact_messages (
  full_name,
  email,
  message,
  source,
  status
) values (
  'Test Contact',
  'contact@example.com',
  'test',
  'web_contact_form',
  'letto'
);
reset role;

-- E3: analytics_events insert anon con campaign_id valorizzato deve fallire.
set local role anon;
insert into public.analytics_events (
  occurred_at,
  session_id,
  event_type,
  campaign_id
) values (
  now(),
  'session-test',
  'page_view',
  '00000000-0000-0000-0000-000000000000'
);
reset role;
