-- =========================================================================
-- 0000 — Extensions & shared helpers
--
-- Idempotente. Definisce ciò che serve a tutte le migrazioni successive:
--   • estensione pgcrypto (per gen_random_uuid)
--   • funzione trigger generica per tenere allineato updated_at
--
-- Nota:
--   • RLS NON è abilitata qui (vedi E2).
--   • Nessun INSERT di dati di business.
-- =========================================================================

create extension if not exists "pgcrypto";

-- Helper riusato dalle tabelle con colonna updated_at.
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at_timestamp() is
  'Generic BEFORE UPDATE trigger function that bumps updated_at to now().';
