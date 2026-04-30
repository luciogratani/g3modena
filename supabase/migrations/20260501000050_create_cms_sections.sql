-- =========================================================================
-- 0050 — cms_sections
--
-- Tabella unica righe-per-sezione (DB_CMS_INTEGRATION §4 e §12).
-- Sezioni editoriali + 'seo' come riga speciale.
--
-- Vincolo unique: (tenant_schema, section_key) considerando NULL == NULL così
-- esiste una sola riga "globale" per ciascuna section_key quando il tenant
-- non è valorizzato (Postgres 15+: NULLS NOT DISTINCT).
-- =========================================================================

create table if not exists public.cms_sections (
  id             uuid primary key default gen_random_uuid(),
  tenant_schema  text,
  section_key    text not null,
  content        jsonb not null default '{}'::jsonb,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint cms_sections_section_key_check
    check (section_key in (
      'hero',
      'about',
      'clients',
      'why_g3',
      'footer',
      'sections',
      'seo'
    )),
  constraint cms_sections_tenant_schema_format_check
    check (
      tenant_schema is null
      or tenant_schema ~ '^[a-z][a-z0-9_]{0,62}$'
    ),
  constraint cms_sections_unique_per_tenant
    unique nulls not distinct (tenant_schema, section_key)
);

comment on table public.cms_sections is
  'Contenuti CMS sito: una riga per sezione editoriale + riga speciale section_key=seo.';
comment on column public.cms_sections.tenant_schema is
  'Identificativo tenant logico opzionale; NULL = configurazione globale.';
comment on column public.cms_sections.content is
  'Payload JSON normalizzato dall adapter web (web/lib/content-adapter.ts).';
comment on column public.cms_sections.is_published is
  'Flag publish/draft pre-implementazione del flow versioning (TODO post-launch).';

create index if not exists cms_sections_tenant_published_idx
  on public.cms_sections (coalesce(tenant_schema, ''), is_published);

drop trigger if exists cms_sections_set_updated_at on public.cms_sections;
create trigger cms_sections_set_updated_at
  before update on public.cms_sections
  for each row execute function public.set_updated_at_timestamp();
