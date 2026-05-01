-- =========================================================================
-- 0080 — candidates: discard column (A4)
--
-- Aggiunge il quinto stato kanban `scartati` con motivazione strutturata
-- (reason key whitelisted v1 + nota opzionale, obbligatoria app-side se
-- reason key = 'other'), timestamp di scarto e return status per il
-- ripristino dalla colonna.
--
-- Decisioni allineate al plan A4:
--   • coexist distinct con `archivio` (cleanup legacy nel drawer): nessun
--     backfill record esistenti.
--   • cleanup metadata simmetrico al pattern `postpone`: gestito app-side
--     in `clearDiscardMetadataIfNeeded`. Niente trigger DB in v1.
--   • catalogo ragioni v1: 8 chiavi enumerate, fallback `other`.
--   • estensione futura: aggiungere chiavi alla CHECK senza migrazione dati.
-- =========================================================================

alter table public.candidates
  drop constraint if exists candidates_pipeline_stage_check;

alter table public.candidates
  add constraint candidates_pipeline_stage_check
    check (
      pipeline_stage in (
        'nuovo',
        'colloquio',
        'formazione',
        'in_attesa',
        'scartati',
        'rimandati',
        'archivio'
      )
    );

alter table public.candidates
  add column if not exists discard_reason_key    text,
  add column if not exists discard_reason_note   text,
  add column if not exists discarded_at          timestamptz,
  add column if not exists discard_return_status text;

alter table public.candidates
  drop constraint if exists candidates_discard_reason_key_check;
alter table public.candidates
  add constraint candidates_discard_reason_key_check
    check (
      discard_reason_key is null
      or discard_reason_key in (
        'not_a_fit',
        'no_show',
        'declined_by_candidate',
        'unreachable',
        'duplicate',
        'failed_interview',
        'failed_training',
        'other'
      )
    );

alter table public.candidates
  drop constraint if exists candidates_discard_reason_note_length_check;
alter table public.candidates
  add constraint candidates_discard_reason_note_length_check
    check (
      discard_reason_note is null
      or char_length(btrim(discard_reason_note)) between 1 and 500
    );

alter table public.candidates
  drop constraint if exists candidates_discard_return_status_check;
alter table public.candidates
  add constraint candidates_discard_return_status_check
    check (
      discard_return_status is null
      or discard_return_status in (
        'nuovo',
        'colloquio',
        'formazione',
        'in_attesa',
        'rimandati'
      )
    );

comment on column public.candidates.pipeline_stage is
  'Colonna kanban corrente; set v1: nuovo|colloquio|formazione|in_attesa|scartati|rimandati|archivio.';
comment on column public.candidates.discard_reason_key is
  'Motivo strutturato dello scarto (catalogo v1: not_a_fit|no_show|declined_by_candidate|unreachable|duplicate|failed_interview|failed_training|other). NULL fuori da pipeline_stage = ''scartati''.';
comment on column public.candidates.discard_reason_note is
  'Nota libera sullo scarto (max 500 char). Obbligatoria app-side quando discard_reason_key = ''other''.';
comment on column public.candidates.discarded_at is
  'Timestamp del passaggio in scartati. NULL fuori dalla colonna.';
comment on column public.candidates.discard_return_status is
  'Colonna di ritorno usata da "Ripristina" (nuovo|colloquio|formazione|in_attesa|rimandati). Fallback app-side: nuovo.';

create index if not exists candidates_discard_reason_idx
  on public.candidates (discard_reason_key)
  where discard_reason_key is not null;
