-- =========================================================================
-- 20260509000020 — L7 / Campaign KPI aggregates v1
--
-- RPC per le card admin in `Marketing › Campagne` (vedi
-- docs/CAMPAIGNS_CONTRACT.md §5). Restituisce i 5 conteggi minimi per
-- campagna richiesti dallo Step 7 del prompt analytics ingest:
--   • page_view, cta_click, careers_form_open, careers_submit, careers_abandon.
--
-- Solo eventi gia attribuiti (campaign_id non null) vengono aggregati;
-- la risoluzione `cid -> campaign_id` resta server-side dell'ingest
-- (Edge Function `analytics-ingest`).
--
-- Sicurezza: SECURITY INVOKER (default) — chi chiama deve avere SELECT
-- su `analytics_events`. EXECUTE riservato a `authenticated` (admin).
-- Fuori dalla policy admin-only la function non e' utile (anon non puo
-- leggere `analytics_events`).
-- =========================================================================

create or replace function public.campaign_kpi_aggregates_v1()
returns table (
  campaign_id              uuid,
  page_view_count          bigint,
  cta_click_count          bigint,
  careers_form_open_count  bigint,
  careers_submit_count     bigint,
  careers_abandon_count    bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    e.campaign_id,
    count(*) filter (where e.event_type = 'page_view')         as page_view_count,
    count(*) filter (where e.event_type = 'cta_click')         as cta_click_count,
    count(*) filter (where e.event_type = 'careers_form_open') as careers_form_open_count,
    count(*) filter (where e.event_type = 'careers_submit')    as careers_submit_count,
    count(*) filter (where e.event_type = 'careers_abandon')   as careers_abandon_count
  from public.analytics_events e
  where e.campaign_id is not null
  group by e.campaign_id;
$$;

comment on function public.campaign_kpi_aggregates_v1() is
  'KPI aggregati per campagna (page_view, cta_click, careers_form_open, careers_submit, careers_abandon). Solo eventi attribuiti (campaign_id non null).';

revoke all on function public.campaign_kpi_aggregates_v1() from public;
grant execute on function public.campaign_kpi_aggregates_v1() to authenticated;
