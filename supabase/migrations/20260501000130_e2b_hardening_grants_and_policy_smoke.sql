-- =========================================================================
-- 0130 — E2b / Grants hardening + policy smoke script
--
-- RLS da sola non basta: i ruoli devono avere GRANT minimi coerenti.
-- Qui restringiamo i permessi tabellari a quanto previsto dalla matrice E2b.
--
-- Nota:
--   • "service_role" bypassa RLS (comportamento Supabase) e non viene limitato
--     qui perché usato lato server trusted.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) Reset grants su tabelle target
-- -------------------------------------------------------------------------
revoke all on table public.cities            from anon, authenticated;
revoke all on table public.campaigns         from anon, authenticated;
revoke all on table public.candidates        from anon, authenticated;
revoke all on table public.staff             from anon, authenticated;
revoke all on table public.cms_sections      from anon, authenticated;
revoke all on table public.contact_messages  from anon, authenticated;
revoke all on table public.analytics_events  from anon, authenticated;

-- -------------------------------------------------------------------------
-- 2) Grants per authenticated (admin baseline full CRUD)
-- -------------------------------------------------------------------------
grant select, insert, update, delete on table public.cities            to authenticated;
grant select, insert, update, delete on table public.campaigns         to authenticated;
grant select, insert, update, delete on table public.candidates        to authenticated;
grant select, insert, update, delete on table public.staff             to authenticated;
grant select, insert, update, delete on table public.cms_sections      to authenticated;
grant select, insert, update, delete on table public.contact_messages  to authenticated;
grant select, insert, update, delete on table public.analytics_events  to authenticated;

-- -------------------------------------------------------------------------
-- 3) Grants per anon (superficie minima)
-- -------------------------------------------------------------------------
grant select on table public.cities       to anon;
grant select on table public.cms_sections to anon;
grant insert on table public.candidates       to anon;
grant insert on table public.contact_messages to anon;
grant insert on table public.analytics_events to anon;

-- analytics_events.id è identity -> serve uso sequence in insert anon/auth.
grant usage, select on sequence public.analytics_events_id_seq to anon, authenticated;

-- -------------------------------------------------------------------------
-- 4) Smoke test SQL (manuale; non eseguito automaticamente dalla migration)
-- -------------------------------------------------------------------------
-- Eseguire dopo `supabase db push`, in ambiente di test:
--
-- -- anon: allowed
-- set local role anon;
-- select id, slug from public.cities;                                     -- solo is_active
-- select id, section_key from public.cms_sections;                        -- solo published
-- select public.resolve_campaign_id_from_cid('abc12345');                 -- ok
--
-- -- anon: denied
-- select * from public.candidates limit 1;                                -- deve fallire
-- select * from public.campaigns limit 1;                                 -- deve fallire
-- update public.analytics_events set city_slug = 'x' where false;         -- deve fallire
--
-- -- authenticated: allowed baseline
-- set local role authenticated;
-- select count(*) from public.candidates;                                 -- ok
-- update public.contact_messages set status = 'letto' where false;        -- ok
--
-- reset role;
