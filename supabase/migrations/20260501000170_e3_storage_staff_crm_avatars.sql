-- =========================================================================
-- 0170 — E3 Storage: avatar staff da CRM admin (prefisso path `crm-staff/`)
--
-- Bucket privato caricato dall'admin autenticato (`public.staff.avatar_path`
-- può puntare qui con path relativi tipo `crm-staff/<uuid>.webp`, distinti
-- dagli allegati candidature su `careers-photos`).
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
    'staff-crm-avatars',
    'staff-crm-avatars',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists staff_crm_avatars_authenticated_select on storage.objects;
create policy staff_crm_avatars_authenticated_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'staff-crm-avatars');

drop policy if exists staff_crm_avatars_authenticated_insert on storage.objects;
create policy staff_crm_avatars_authenticated_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'staff-crm-avatars');

drop policy if exists staff_crm_avatars_authenticated_update on storage.objects;
create policy staff_crm_avatars_authenticated_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'staff-crm-avatars')
  with check (bucket_id = 'staff-crm-avatars');

drop policy if exists staff_crm_avatars_authenticated_delete on storage.objects;
create policy staff_crm_avatars_authenticated_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'staff-crm-avatars');
