-- =========================================================================
-- 0090 — E2b / Enable RLS baseline
--
-- Abilita RLS sulle tabelle v1 e forza l'applicazione delle policy sulle
-- tabelle PII/sensibili.
--
-- Nota: nessun seed/mock. Solo hardening autorizzativo.
-- =========================================================================

alter table public.cities            enable row level security;
alter table public.campaigns         enable row level security;
alter table public.candidates        enable row level security;
alter table public.staff             enable row level security;
alter table public.cms_sections      enable row level security;
alter table public.contact_messages  enable row level security;
alter table public.analytics_events  enable row level security;

-- Force RLS su domini sensibili e/o non pubblici.
alter table public.campaigns         force row level security;
alter table public.candidates        force row level security;
alter table public.staff             force row level security;
alter table public.contact_messages  force row level security;
alter table public.analytics_events  force row level security;
