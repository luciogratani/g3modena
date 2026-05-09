-- =========================================================================
-- 20260509000010 — L6 / Campaign timeline update RPC
--
-- RPC chiamata server-side dall'Edge Function `analytics-ingest` dopo
-- l'insert di eventi attribuiti a una campagna (campaign_id non null).
--
-- Regole (allineate a docs/CAMPAIGNS_CONTRACT.md §2):
--   • first_data_at: impostato al primo evento attribuito; non retrocede.
--   • last_data_at:  aggiornato all'evento attribuito piu recente.
--
-- Implementazione tramite LEAST/GREATEST su (current, candidate) per:
--   • essere safe su batch concorrenti / out-of-order;
--   • preservare il check constraint `campaigns_data_window_check`
--     (last_data_at >= first_data_at).
--
-- Sicurezza:
--   • SECURITY DEFINER → bypassa RLS sulla tabella `campaigns`;
--   • EXECUTE riservato a service_role (chiamata solo da Edge Function trusted).
-- =========================================================================

create or replace function public.apply_campaign_event_timeline(
  p_campaign_id      uuid,
  p_min_occurred_at  timestamptz,
  p_max_occurred_at  timestamptz
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.campaigns
  set
    first_data_at = least(coalesce(first_data_at, p_min_occurred_at), p_min_occurred_at),
    last_data_at  = greatest(coalesce(last_data_at,  p_max_occurred_at), p_max_occurred_at)
  where id = p_campaign_id;
$$;

comment on function public.apply_campaign_event_timeline(uuid, timestamptz, timestamptz) is
  'Server-side ingest helper: aggiorna campaigns.first_data_at / last_data_at preservando il check campaigns_data_window_check.';

-- Hardening privilegi funzione: solo service_role (Edge Function trusted).
revoke all on function public.apply_campaign_event_timeline(uuid, timestamptz, timestamptz) from public;
grant execute on function public.apply_campaign_event_timeline(uuid, timestamptz, timestamptz) to service_role;
