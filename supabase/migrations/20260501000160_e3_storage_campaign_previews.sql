-- =========================================================================
-- 0160 — E3 Storage: anteprime creatività campagne (CAMPAIGNS_CONTRACT §6)
--
-- Bucket privato caricato dall'admin autenticato (`creative_image_path` in
-- `public.campaigns` è path relativo a questo bucket, senza prefisso nome bucket).
-- Il sito pubblico non legge questo bucket direttamente: preview in admin via
-- URL firmati.
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
    'campaign-previews',
    'campaign-previews',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists campaign_previews_authenticated_select on storage.objects;
create policy campaign_previews_authenticated_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'campaign-previews');

drop policy if exists campaign_previews_authenticated_insert on storage.objects;
create policy campaign_previews_authenticated_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'campaign-previews');

drop policy if exists campaign_previews_authenticated_update on storage.objects;
create policy campaign_previews_authenticated_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'campaign-previews')
  with check (bucket_id = 'campaign-previews');

drop policy if exists campaign_previews_authenticated_delete on storage.objects;
create policy campaign_previews_authenticated_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'campaign-previews');
