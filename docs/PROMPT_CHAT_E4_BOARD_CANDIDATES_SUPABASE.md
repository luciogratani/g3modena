# Prompt per chat dedicata — **E4 / L5: board candidati su Supabase**

**Stato:** implementato (2026-05-01). Board su **`public.candidates`** (`admin_workflow` + `kanban_rank`), repository `candidates-repository.ts`, hook **`useCandidateBoardState`** senza **`admin:candidates:board:v1`**; gate **`L5`** in roadmap. Il testo sotto è **contesto storico** (specifica pre-implementazione utile per revisioni / onboarding).

Copia il blocco **«Prompt (copia da qui)»** in una nuova chat Cursor solo se serve ripercorrere le decisioni di design già chiuse.

---

## Prompt (copia da qui)

> **Archivio (pre-L5):** il paragrafo seguente descriveva la board **prima** della migrazione. Nel codice attuale la sorgente è **`public.candidates`** via `candidates-repository.ts` e `useCandidateBoardState`; **`admin:candidates:board:v1`** non è più usato; da `mockCandidates.ts` restano tipi/cataloghi, non l’array `CANDIDATES` nel percorso online.

Sei nel monorepo **g3modena**. **Config › Sedi** e il form web leggono **`public.cities`**. **L1** inserisce righe **`public.candidates`** dal sito (`pipeline_stage = 'nuovo'`, FK `city_id`). In admin la kanban **`CandidatiBoard`** + hook **`useCandidateBoardState`** usano ancora **`admin/src/data/mockCandidates.ts`** come dataset e **`admin:candidates:board:v1`** (`localStorage`) per colonne ordinate + metadata ricche (`board-utils.ts`, versione persistenza **v3** con sub-lane formazione in `byId`).

### Obiettivo

Spostare la board su **`public.candidates`** come fonte condivisa (**gate `L5`**, continuazione **`E4`**):

1. **Lettura:** liste per sede (`boardCity` slug → `city_id`) tramite Supabase client **authenticated** (policy già presente su `candidates`).
2. **Scrittura:** ogni azione che oggi aggiorna `boardState` + `localStorage` deve riflettersi sul DB (`UPDATE` sicuri, optimistic UI opzionale).
3. **Rimuovere dipendenza dai mock** nel percorso “online” (mock solo fallback dev/test se esplicitamente richiesto).

### Schemi DB già disponibili vs modello UI `Candidate`

La tabella (`20260501000030` + alter **`0080`**) copre anagrafica base, **`pipeline_stage`** (include **`scartati`**), colonne **discard**, UTM, allegati path, ecc. Il tipo TS **`Candidate`** in `mockCandidates.ts` ha molti campi **solo admin** (note, date colloquio/formazione/rinvii, sub-lane, outcome, ecc.) che **non** hanno colonne dedicate in SQL.

**Decisione richiesta all’inizio (una strategia):**

- **A — JSONB amministrativo**  
  Aggiungere una colonna tipo **`admin_workflow jsonb`** (nome da concordare) per snapshot workflow UI non normalizzato; `pipeline_stage` + discard restano colonne “canoniche” per query/indici.
- **B — Solo colonne SQL**  
  Estendere migrazioni con colonne per ogni campo necessario (più pesante).
- **C — Ibrido minimo**  
  Persistere solo **`pipeline_stage`** + discard + pochi campi; accettare perdita/recupero limitato delle altre UI properties finché non si espande lo schema.

### Ordinamento dentro la colonna kanban

Oggi l’ordine delle card è **`columns[status]: string[]`** nel blob locale. Il DB non ha ancora un campo esplicito di **rank** dentro lo stesso `pipeline_stage`.

**Decisione richiesta:** introdurre es. **`kanban_rank numeric`** o **`sort_order integer`** scoped per `(city_id, pipeline_stage)` (o globale per riga), aggiornato a ogni drag-and-drop — **oppure** codificare l’ordine dentro JSONB (meno query-friendly).

### Migrazione identità

I mock usano id tipo **`c1`**; il DB usa **UUID**. Le righe create da **L1** hanno già UUID. Pianificare:

- sviluppo: board solo su righe DB reali;
- eventuale tool una tantum per import mock → INSERT (solo locale), non in migrazioni schema-only del repo.

### File chiave da leggere

- `supabase/migrations/20260501000030_create_candidates.sql`, `20260501000080_alter_candidates_discard.sql`
- `supabase/migrations/20260501000100_e2b_policies_authenticated_admin.sql` (`candidates`)
- `admin/src/components/candidati-board/board-utils.ts` (`CandidateBoardPersistenceAdapter`, serialize/hydrate v3)
- `admin/src/components/candidati-board/useCandidateBoardState.ts`
- `admin/src/data/mockCandidates.ts` (`Candidate`, `CandidateStatus`, `KANBAN_COLUMNS`)
- `admin/tests/board/*` — aggiornare/adattare dopo cambio persistenza

### Definition of done (orientativa)

- Due browser loggati vedono gli stessi candidati per sede e lo stesso **`pipeline_stage`** dopo refresh.
- DnD e dialog workflow aggiornano il DB senza perdita silenziosa dei vincoli CHECK (stage, discard rules).
- Evento **`admin:candidates:board-updated`** sostituito o mantenuto coerente per badge sidebar “Nuovo”.
- **`pnpm --filter admin build`** e **`pnpm test:board`** verdi (o test aggiornati con nuovi adapter/mock).
- Documentazione: **`docs/IMPLEMENTATION_ROADMAP.md`** ( **`L5`** / **`E4`** ), **`docs/DEVELOPMENT_NOTES.md`** (board persistence).

### Deploy / dati

Nessuna Edge Function nuova obbligatoria. Serve progetto Supabase con **`candidates`** + **`cities`** coerenti; ricezione web già tramite **L1**.

---

## Nota uso

Dopo il merge: aggiorna footer roadmap e link incrociato sotto **`E4`** / **`L5`** se utile.
