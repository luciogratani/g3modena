-- =========================================================================
-- 0110 — E2b / Policies for anon (public surface minimum)
--
-- Obiettivo: ridurre la superficie del ruolo anon allo stretto indispensabile
-- per i flussi sito pubblico.
--
-- Flussi consentiti:
--   • cities: read-only, solo sedi attive;
--   • cms_sections: read-only, solo published (+ tenant match quando presente);
--   • candidates: insert-only, con guardrail minimi su payload submit pubblico;
--   • contact_messages: insert-only, vincolato a source/status web;
--   • analytics_events: insert-only append-only.
-- =========================================================================

-- Helper lettura tenant da claim JWT (opzionale).
create or replace function public.request_tenant_schema()
returns text
language sql
stable
as $$
  select nullif(
    (
      nullif(current_setting('request.jwt.claims', true), '')::jsonb
      ->> 'tenant_schema'
    ),
    ''
  );
$$;

comment on function public.request_tenant_schema() is
  'Returns tenant_schema from JWT claims when present; NULL otherwise.';

-- cities: anon può leggere solo sedi attive (per step città nel form web).
drop policy if exists cities_anon_select_active on public.cities;
create policy cities_anon_select_active
  on public.cities
  for select
  to anon
  using (is_active = true);

-- cms_sections: anon read solo published.
-- Tenant rule:
--   • se row tenant_schema è NULL => sempre leggibile (global content);
--   • se row tenant_schema è valorizzato => leggibile solo con claim match.
drop policy if exists cms_sections_anon_select_published on public.cms_sections;
create policy cms_sections_anon_select_published
  on public.cms_sections
  for select
  to anon
  using (
    is_published = true
    and (
      tenant_schema is null
      or tenant_schema = public.request_tenant_schema()
    )
  );

-- candidates: insert-only anon (submit careers pubblico).
drop policy if exists candidates_anon_insert_web_submit on public.candidates;
create policy candidates_anon_insert_web_submit
  on public.candidates
  for insert
  to anon
  with check (
    -- submit pubblico parte sempre da "nuovo"
    pipeline_stage = 'nuovo'
    -- metadati colonna Scartati non ammessi al submit pubblico
    and discard_reason_key is null
    and discard_reason_note is null
    and discarded_at is null
    and discard_return_status is null
    -- consenso privacy richiesto
    and privacy_consent_accepted = true
    -- city_id deve puntare a una sede attiva
    and exists (
      select 1
      from public.cities c
      where c.id = city_id
        and c.is_active = true
    )
  );

-- contact_messages: insert-only anon, forzato su flusso web.
drop policy if exists contact_messages_anon_insert_web_form on public.contact_messages;
create policy contact_messages_anon_insert_web_form
  on public.contact_messages
  for insert
  to anon
  with check (
    source = 'web_contact_form'
    and status = 'nuovo'
  );

-- analytics_events: insert-only anon append-only.
drop policy if exists analytics_events_anon_insert_ingest on public.analytics_events;
create policy analytics_events_anon_insert_ingest
  on public.analytics_events
  for insert
  to anon
  with check (
    -- append-only pubblico: il mapping a campaign_id avviene server-side.
    campaign_id is null
    -- prevenzione poisoning temporale grossolano.
    and occurred_at <= now() + interval '10 minutes'
    and occurred_at >= now() - interval '30 days'
  );
