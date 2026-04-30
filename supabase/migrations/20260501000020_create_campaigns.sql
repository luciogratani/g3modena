-- =========================================================================
-- 0020 — campaigns
--
-- Allineata a docs/CAMPAIGNS_CONTRACT.md (forma canonica v1):
--   • cid (token corto pubblico) UNIQUE — ID di tracking nel link.
--   • campaigns.id (uuid) ID interno canonico per FK candidates/analytics.
--   • Nessuna colonna `status` persistita: derivato runtime da
--     first_data_at / last_data_at (soglia 5 giorni).
--   • Nessun `ends_at` in v1 (CAMPAIGNS_CONTRACT non lo prevede).
--
-- Mismatch risolto rispetto all'ERD in PRE_WIRING_CONCEPT.md §"ERD minimo"
-- (che ipotizzava `slug UK` + `status` + `ends_at` + `preview_image_path`):
-- la fonte autoritativa per la v1 è CAMPAIGNS_CONTRACT.md → si segue questa.
-- =========================================================================

create table if not exists public.campaigns (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  subtitle             text not null,
  cid                  text not null,
  base_url             text not null,
  utm_source           text,
  utm_medium           text,
  utm_campaign         text not null,
  utm_term             text,
  utm_content          text,
  creative_image_path  text not null,
  starts_at            timestamptz not null default now(),
  first_data_at        timestamptz,
  last_data_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint campaigns_cid_unique unique (cid),
  constraint campaigns_cid_format_check
    check (cid ~ '^[A-Za-z0-9_-]{4,32}$'),
  constraint campaigns_name_length_check
    check (char_length(btrim(name)) between 1 and 160),
  constraint campaigns_subtitle_length_check
    check (char_length(btrim(subtitle)) between 1 and 280),
  constraint campaigns_base_url_format_check
    check (base_url ~* '^https?://'),
  constraint campaigns_utm_campaign_length_check
    check (char_length(btrim(utm_campaign)) between 1 and 120),
  constraint campaigns_data_window_check
    check (
      first_data_at is null
      or last_data_at is null
      or last_data_at >= first_data_at
    )
);

comment on table public.campaigns is
  'Campagne marketing. Stato (No dati|Attiva|Disattiva) calcolato a runtime da first_data_at / last_data_at (CAMPAIGNS_CONTRACT.md §2).';
comment on column public.campaigns.cid is
  'Token corto pubblico nei link (UNIQUE). campaigns.id resta l ID canonico interno.';
comment on column public.campaigns.first_data_at is
  'Primo evento attribuito alla campagna (di norma page_view con cid valido).';
comment on column public.campaigns.last_data_at is
  'Ultimo evento attribuito alla campagna; usato per derivare lo stato (soglia 5 giorni).';
comment on column public.campaigns.creative_image_path is
  'Path Storage relativo al bucket campaign-previews (creazione in E3).';

create index if not exists campaigns_starts_at_idx
  on public.campaigns (starts_at desc);
create index if not exists campaigns_last_data_at_idx
  on public.campaigns (last_data_at desc nulls last);
create index if not exists campaigns_utm_campaign_idx
  on public.campaigns (utm_campaign);

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at_timestamp();
