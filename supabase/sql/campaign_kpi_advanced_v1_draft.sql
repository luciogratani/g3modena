-- =========================================================================
-- DRAFT (non applicato automaticamente)
-- campaign_kpi_advanced_v1()
--
-- Scopo:
--   Preparare una RPC post-MVP con KPI campagne avanzate:
--   1) candidates_created_count (da public.candidates)
--   2) avg_registration_seconds (media su candidates.registration_duration_seconds)
--   3) submit_conversions_by_city (da analytics_events careers_submit)
--
-- Questo file NON e' una migration: resta parcheggiato in `supabase/sql/`
-- finche non si decide di attivarlo in produzione.
--
-- Attivazione consigliata quando serve:
--   1) creare nuova migration versionata in `supabase/migrations/`
--   2) copiare il blocco CREATE FUNCTION + grants
--   3) eseguire `supabase db push`
-- =========================================================================

create or replace function public.campaign_kpi_advanced_v1()
returns table (
  campaign_id                  uuid,
  candidates_created_count     bigint,
  avg_registration_seconds     numeric(10,2),
  submit_conversions_by_city   jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with candidates_agg as (
    select
      c.campaign_id,
      count(*)::bigint as candidates_created_count,
      round(avg(c.registration_duration_seconds)::numeric, 2) as avg_registration_seconds
    from public.candidates c
    where c.campaign_id is not null
    group by c.campaign_id
  ),
  submits_by_city as (
    select
      e.campaign_id,
      coalesce(nullif(trim(e.city_slug), ''), 'unknown') as city_slug,
      count(*)::bigint as submit_count
    from public.analytics_events e
    where e.campaign_id is not null
      and e.event_type = 'careers_submit'
    group by
      e.campaign_id,
      coalesce(nullif(trim(e.city_slug), ''), 'unknown')
  ),
  submits_city_json as (
    select
      s.campaign_id,
      jsonb_object_agg(s.city_slug, s.submit_count order by s.city_slug) as submit_conversions_by_city
    from submits_by_city s
    group by s.campaign_id
  )
  select
    cp.id as campaign_id,
    coalesce(ca.candidates_created_count, 0::bigint) as candidates_created_count,
    ca.avg_registration_seconds,
    coalesce(sc.submit_conversions_by_city, '{}'::jsonb) as submit_conversions_by_city
  from public.campaigns cp
  left join candidates_agg ca
    on ca.campaign_id = cp.id
  left join submits_city_json sc
    on sc.campaign_id = cp.id;
$$;

comment on function public.campaign_kpi_advanced_v1() is
  'DRAFT post-MVP: candidates_created_count, avg_registration_seconds, submit_conversions_by_city per campaign_id.';

revoke all on function public.campaign_kpi_advanced_v1() from public;
grant execute on function public.campaign_kpi_advanced_v1() to authenticated;
