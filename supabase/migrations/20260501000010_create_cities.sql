-- =========================================================================
-- 0010 — cities
--
-- Source of truth per le sedi operative (admin Config › Sedi e step "Scegli
-- la città" del form web). FK puntano a cities.id; cities.slug resta come
-- token leggibile per URL/analytics/export (sostituisce il legacy city_code).
--
-- Riferimenti: docs/PRE_WIRING_CONCEPT.md §5–6, docs/DB_CMS_INTEGRATION.md §12.
-- Nessun seed: le sedi reali entreranno via adapter admin (E4) o INSERT manuale
-- del cliente.
-- =========================================================================

create table if not exists public.cities (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null,
  display_name text not null,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint cities_slug_unique unique (slug),
  constraint cities_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 1 and 64),
  constraint cities_display_name_length_check
    check (char_length(btrim(display_name)) between 1 and 120)
);

comment on table public.cities is
  'Sedi G3 (es. Modena, Sassari). Source of truth per board admin e step città del form web.';
comment on column public.cities.slug is
  'Token kebab-case stabile usato in URL/analytics/export (sostituisce il legacy city_code).';
comment on column public.cities.is_active is
  'Se false, la sede non compare nel form pubblico ma resta riferibile dallo storico admin.';

create index if not exists cities_active_sort_idx
  on public.cities (is_active, sort_order, slug);

drop trigger if exists cities_set_updated_at on public.cities;
create trigger cities_set_updated_at
  before update on public.cities
  for each row execute function public.set_updated_at_timestamp();
