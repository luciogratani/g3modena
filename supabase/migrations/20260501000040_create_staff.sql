-- =========================================================================
-- 0040 — staff
--
-- Naming DB: `staff` (lo strato UI continua a chiamarsi "Camerieri").
-- Allineato a admin/src/components/camerieri/types.ts (tags, sourceCandidateId).
--
-- Decisioni:
--   • source_candidate_id FK nullable → idempotenza promozione da board.
--   • tags text[] vincolato da CHECK al set v1 (CameriereTag).
--   • avatar_path: path Storage (E3 definirà bucket); url runtime via signed/public.
--
-- =========================================================================

create table if not exists public.staff (
  id                    uuid primary key default gen_random_uuid(),
  city_id               uuid not null
                          references public.cities (id) on delete restrict,
  source_candidate_id   uuid
                          references public.candidates (id) on delete set null,
  first_name            text not null,
  last_name             text not null,
  avatar_path           text,
  email                 text,
  phone                 text,
  is_active             boolean not null default true,
  tags                  text[] not null default '{}'::text[],
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint staff_first_name_length_check
    check (char_length(btrim(first_name)) between 1 and 80),
  constraint staff_last_name_length_check
    check (char_length(btrim(last_name)) between 1 and 80),
  constraint staff_email_format_check
    check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint staff_phone_length_check
    check (phone is null or char_length(btrim(phone)) between 4 and 40),
  constraint staff_tags_subset_check
    check (
      tags <@ array['automunito','esperienza','multilingue','fuori_sede']::text[]
    ),
  -- idempotenza promozione candidato → staff: max una riga per candidato.
  constraint staff_source_candidate_unique unique (source_candidate_id)
);

comment on table public.staff is
  'Personale operativo (UI: Camerieri). Eventuale promozione idempotente da candidates.id via source_candidate_id.';
comment on column public.staff.source_candidate_id is
  'Candidato di origine (UNIQUE quando valorizzato): garantisce idempotenza promozione.';
comment on column public.staff.tags is
  'Tag CRM v1: subset di {automunito, esperienza, multilingue, fuori_sede}.';

create index if not exists staff_city_active_idx
  on public.staff (city_id, is_active);
create index if not exists staff_city_name_idx
  on public.staff (city_id, last_name, first_name);

drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at_timestamp();
