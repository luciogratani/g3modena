-- =========================================================================
-- 0120 — E2b / Public bridge for campaign lookup (cid -> campaign_id)
--
-- Manteniamo campaigns non leggibile da anon, ma esponiamo una funzione
-- stretta che risolve solo l'ID interno da un cid valido.
--
-- Uso previsto:
--   • endpoint ingest/receiver pubblico: risolve campaign_id senza SELECT diretto.
--   • client web può chiamarla solo se si sceglie strategia PostgREST diretta;
--     in alternativa la usa Edge Function con service role.
-- =========================================================================

create or replace function public.resolve_campaign_id_from_cid(p_cid text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id
  from public.campaigns c
  where c.cid = nullif(btrim(p_cid), '')
  limit 1;
$$;

comment on function public.resolve_campaign_id_from_cid(text) is
  'Returns campaigns.id from public cid token, without exposing campaigns table to anon.';

-- Hardening privilegi funzione.
revoke all on function public.resolve_campaign_id_from_cid(text) from public;
grant execute on function public.resolve_campaign_id_from_cid(text) to anon;
grant execute on function public.resolve_campaign_id_from_cid(text) to authenticated;
