-- =========================================================================
-- 0710 — B3 / Site settings
--
-- Configurazione runtime globale per il sito pubblico.
-- Nessun seed business: in assenza della riga site_mode, admin/web devono
-- usare il fallback applicativo sicuro "normal".
-- =========================================================================

create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_settings_key_check
    check (key in ('site_mode')),
  constraint site_settings_site_mode_value_check
    check (
      key <> 'site_mode'
      or value in ('normal', 'maintenance', 'careers_only')
    )
);

comment on table public.site_settings is
  'Impostazioni globali runtime del sito pubblico.';
comment on column public.site_settings.key is
  'Chiave tecnica stabile della configurazione, es. site_mode.';
comment on column public.site_settings.value is
  'Valore testuale validato per chiave; site_mode = normal | maintenance | careers_only.';

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at_timestamp();

alter table public.site_settings enable row level security;

drop policy if exists site_settings_authenticated_all on public.site_settings;
create policy site_settings_authenticated_all
  on public.site_settings
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists site_settings_anon_select_site_mode on public.site_settings;
create policy site_settings_anon_select_site_mode
  on public.site_settings
  for select
  to anon
  using (key = 'site_mode');
