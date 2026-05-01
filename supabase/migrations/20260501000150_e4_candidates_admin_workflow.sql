-- =========================================================================
-- 0150 — candidates: admin workflow snapshot + kanban rank (E4 / L5)
--
-- Sposta la persistenza della board admin da localStorage a `public.candidates`:
--   • `admin_workflow jsonb` — snapshot UI workflow non normalizzato
--     (note, interview/training/postpone metadata, sub-lane id, score,
--     referral source, profile image URL, ecc.). Shape gestita app-side
--     dal repository, no CHECK in v1.
--   • `kanban_rank numeric` — posizione card dentro lo scope
--     (city_id, pipeline_stage). Strategia midpoint float:
--       - drop tra due card: rank = (prev.rank + next.rank) / 2;
--       - append in coda: rank = max(rank in scope) + 1000;
--       - primo elemento nello scope: rank = 1000.
--     Vantaggi: un solo UPDATE per drag-and-drop (niente rewrite N righe),
--     ORDER BY server-side, indice composito query-friendly.
--
-- Backfill rank: row_number() per (city_id, pipeline_stage) con ordine
-- created_at desc moltiplicato per 1000 (lascia margine per inserzioni
-- intermedie senza riequilibrio immediato).
--
-- L'indice esistente `candidates_city_pipeline_idx` resta utile per scan
-- generici; aggiungiamo `candidates_city_stage_rank_idx` che copre il
-- pattern di lettura tipico della board (filtro sede + ORDER BY rank).
-- =========================================================================

alter table public.candidates
  add column if not exists admin_workflow jsonb not null default '{}'::jsonb,
  add column if not exists kanban_rank    numeric;

update public.candidates c
set kanban_rank = sub.rn * 1000
from (
  select id,
    row_number() over (
      partition by city_id, pipeline_stage
      order by created_at desc
    )::numeric as rn
  from public.candidates
) sub
where c.id = sub.id and c.kanban_rank is null;

alter table public.candidates
  alter column kanban_rank set not null;

create index if not exists candidates_city_stage_rank_idx
  on public.candidates (city_id, pipeline_stage, kanban_rank);

comment on column public.candidates.admin_workflow is
  'Snapshot UI workflow non normalizzato (note, interview/training/postpone metadata, sub-lane, score). v1: shape gestita app-side dal repository admin, nessun CHECK SQL.';
comment on column public.candidates.kanban_rank is
  'Posizione card dentro (city_id, pipeline_stage). Strategia midpoint float: drop = (prev+next)/2, append = max+1000.';
