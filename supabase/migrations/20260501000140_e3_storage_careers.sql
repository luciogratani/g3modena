-- =========================================================================
-- 0140 — E3/L1 Storage for careers attachments
--
-- Buckets privati per allegati candidatura. Il sito pubblico non carica
-- direttamente su Storage: gli upload passano dalla Edge Function
-- `career-submissions` con service role.
-- =========================================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'careers-photos',
    'careers-photos',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'careers-cv',
    'careers-cv',
    false,
    10485760,
    array['application/pdf']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lettura allegati dal backoffice autenticato. Gli oggetti restano non
-- pubblici; eventuali URL firmati vengono generati dall'app admin/server.
drop policy if exists careers_photos_authenticated_select on storage.objects;
create policy careers_photos_authenticated_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'careers-photos');

drop policy if exists careers_cv_authenticated_select on storage.objects;
create policy careers_cv_authenticated_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'careers-cv');

-- La Edge Function usa service role e risolve `cid` tramite lo stesso bridge
-- pubblico, senza duplicare logica applicativa su campaigns.
grant execute on function public.resolve_campaign_id_from_cid(text) to service_role;
