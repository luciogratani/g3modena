-- =========================================================================
-- 0100 — E2b / Policies for authenticated (admin baseline)
--
-- Baseline v1: un utente autenticato in Supabase Auth ha accesso completo
-- ai domini backoffice. Il tightening per ruoli/claim (es. city-scope o
-- admin-only claim) resta evoluzione successiva.
-- =========================================================================

-- cities
drop policy if exists cities_authenticated_all on public.cities;
create policy cities_authenticated_all
  on public.cities
  for all
  to authenticated
  using (true)
  with check (true);

-- campaigns
drop policy if exists campaigns_authenticated_all on public.campaigns;
create policy campaigns_authenticated_all
  on public.campaigns
  for all
  to authenticated
  using (true)
  with check (true);

-- candidates
drop policy if exists candidates_authenticated_all on public.candidates;
create policy candidates_authenticated_all
  on public.candidates
  for all
  to authenticated
  using (true)
  with check (true);

-- staff
drop policy if exists staff_authenticated_all on public.staff;
create policy staff_authenticated_all
  on public.staff
  for all
  to authenticated
  using (true)
  with check (true);

-- cms_sections
drop policy if exists cms_sections_authenticated_all on public.cms_sections;
create policy cms_sections_authenticated_all
  on public.cms_sections
  for all
  to authenticated
  using (true)
  with check (true);

-- contact_messages
drop policy if exists contact_messages_authenticated_all on public.contact_messages;
create policy contact_messages_authenticated_all
  on public.contact_messages
  for all
  to authenticated
  using (true)
  with check (true);

-- analytics_events
drop policy if exists analytics_events_authenticated_all on public.analytics_events;
create policy analytics_events_authenticated_all
  on public.analytics_events
  for all
  to authenticated
  using (true)
  with check (true);
