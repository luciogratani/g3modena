-- =========================================================================
-- 0060 — contact_messages
--
-- Tabella separata da analytics_events (PII non finisce in analytics).
-- Mappa il payload del form web /contact + workflow inbox admin
-- (status: nuovo|letto|archiviato).
--
-- session_id è correlazione opzionale verso analytics_events: tipo text per
-- accettare anche valori legacy non-uuid; nessuna FK (tabelle disaccoppiate).
-- =========================================================================

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  company     text,
  email       text not null,
  phone       text,
  city        text,
  message     text not null,
  status      text not null default 'nuovo',
  source      text not null default 'web_contact_form',
  session_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint contact_messages_full_name_length_check
    check (char_length(btrim(full_name)) between 1 and 120),
  constraint contact_messages_email_format_check
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint contact_messages_phone_length_check
    check (phone is null or char_length(btrim(phone)) between 4 and 40),
  constraint contact_messages_city_length_check
    check (city is null or char_length(btrim(city)) between 1 and 80),
  constraint contact_messages_message_length_check
    check (char_length(btrim(message)) between 1 and 5000),
  constraint contact_messages_status_check
    check (status in ('nuovo','letto','archiviato')),
  constraint contact_messages_source_check
    check (source in ('web_contact_form','admin_manual','import'))
);

comment on table public.contact_messages is
  'Messaggi inviati dal form web /contact + stato inbox admin (nuovo|letto|archiviato).';
comment on column public.contact_messages.session_id is
  'Correlazione opzionale verso analytics_events.session_id (no FK, accoppiamento debole).';
comment on column public.contact_messages.source is
  'Provenienza del record: web form, inserimento manuale admin, import storico.';

create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);
create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

drop trigger if exists contact_messages_set_updated_at on public.contact_messages;
create trigger contact_messages_set_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at_timestamp();
