# Prompt — E4 Staff / Camerieri (`public.staff` operativo)

**Stato attuale (2026-05-02):** il CRM **Camerieri** legge e scrive **`public.staff`** via Supabase autenticato. Il vecchio `localStorage` (`admin:camerieri:crm:v1`) non è più nel percorso online; esiste migrazione one-shot `migrateLocalCamerieriToStaffOnce` (marker `admin:camerieri:v1-local-drained-at`). La sidebar **Camerieri** elenca tutte le **sedi attive** (`listActiveCities`), come **Candidati**. Tipo `Cameriere.city` = slug generico (`CandidateCitySlug`). **Promozione da board:** `upsert` su `staff` poi, se ok, **archivia** il candidato (`pipeline_stage = archivio`) con lo stesso meccanismo del menu «Archivia».

**Storico (pre-implementazione):** il CRM persisteva solo su `localStorage` bucketato Modena/Sassari; la UI non usava ancora `public.staff`.

**Quando usare questa chat:** evoluzioni su staff (form «Crea Cameriere», test Vitest dedicati, policy promozione vs delete, note strutturate in archivio).

**Riferimenti da leggere prima:**  
[`docs/IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) § E4 (residuo camerieri), [`docs/DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) § Camerieri + inventario `admin:camerieri:crm:v1`, [`docs/DB_CMS_INTEGRATION.md`](DB_CMS_INTEGRATION.md) § staff, [`supabase/migrations/20260501000040_create_staff.sql`](../supabase/migrations/20260501000040_create_staff.sql), [`supabase/README.md`](../supabase/README.md) matrice RLS.

---

## Prompt (copia da qui)

Obiettivo originale (**completato 2026-05-02**): rendere **operativo** il CRM **Camerieri** su **`public.staff`** in sostituzione di `localStorage` (`storage.ts` rimosso dal percorso online). Per iterazioni successive vedi stato in testa al documento e gli step **5–6** sotto.

Sei nel monorepo **g3modena** (`web/`, `admin/`, `supabase/`). Riferimento implementativo: Supabase client in `admin/src/lib/supabase.ts`.

### Vincolo esecuzione — **uno step per volta** (obbligatorio)

L’operatore usa un **modello con poco contesto**. Per ridurre errori:

1. **Un solo numero di step** da questa lista per volta (es. «esegui solo **Step 3**» o «parti da Step 1»). Non combinare più fasi nella stessa risposta salvo quando l’utente scrive esplicitamente due numeri uniti.
2. **Non** pianificare o toccare file che appartengono allo step successivo. Resta dentro il perimetro dello step richiesto.
3. **Fine step:** sintesi breve (max 8–10 righe): file modificati, come verificare (`pnpm build:admin` se ha senso dopo lo step). **Poi fermati** e attendi conferma («procedi con Step N+1», «correggi X»).
4. Prima di modificare codice già introdotto da uno step precedente, **rileggi** solo quel file/modulo nel turno dedicato allo step che lo cambia — non assumere dall’inferenza lunga.
5. Se uno step blocca dubbio di schema: **fermati** e chiedi all’utente invece di supporre colonne o policy.

### Contesto tecnico confermato

- Tabella **`public.staff`**: colonne `id` (uuid PK), `city_id` → `cities.id`, `source_candidate_id` → `candidates.id` (**UNIQUE** quando valorizzato — idempotenza promozione), `first_name`, `last_name`, `avatar_path` (nullable; path bucket, non URL firmato persistente nella colonna), `email`, `phone`, `is_active`, `tags` `text[]` con CHECK subset `automunito|esperienza|multilingue|fuori_sede`, `created_at`, `updated_at`.
- **RLS:** policy `authenticated` full access (vedi migrazioni E2b).
- UI **tipo** `Cameriere` (`types.ts`): `id` = uuid DB, **`city`** = **`CandidateCitySlug`** (slug allineato a `public.cities`), `avatarUrl` opzionale (signed da path bucket careers quando serve).
- **Sidebar:** **nessun** `SUPPORTED_WAITER_CITY_SLUGS`; voci Camerieri = **`activeCities`** da `listActiveCities()` (stessa base della board Candidati).
- **Promozione da board:** `promoteCandidateToCameriere` / `createCameriereInputFromCandidate` (`mappers.ts`) devono **inserire/upsert** su `staff` con `source_candidate_id` = id candidato (uuid). Se esiste già una riga per quel candidato, aggiornare (idempotenza), non duplicare.
- **Avatar:** in promozione, preferire copia **`candidates.profile_photo_path`** (`avatar_path` su `staff`) se presente; se in UI hai solo URL firmati, recuperare dal row candidato dopo fetch o dalla mappa repository. Evitare di salvare URL firmati scaduti come «path». Se serve visualizzazione in tabella CRM, riusare logica **`createSignedUrl`** simile a `candidates-repository.ts` (`applyCareersPhotoSignedUrls`) sul path bucket careers.
- **Dialog “Crea Cameriere”** (`CreateCameriereDialog.tsx`) è placeholder: decidere MVP (form minimo INSERT su `staff` senza candidato origine `source_candidate_id` null) oppure fase 2 dopo lettura/remoto stabile.

### Compiti — **sequenza fissa** (invoca **un solo** step per conversazione o per messaggio operatore)

| Step | Contenuto | Verifica minima prima dello step successivo |
|------|-----------|---------------------------------------------|
| **1** | Nuovo modulo **`staff-repository.ts`** (o equivalente sotto `camerieri/`): tipi row DB, `listByCitySlug`, `upsert` (inclusa idempotenza `source_candidate_id`), mapping ↔ `Cameriere`, risoluzione `city_id` da `cities.slug`. Nessun hook UI ancora. | `pnpm build:admin` passa; opzionale test unit minimo su mapping puro. |
| **2** | Refactor **`useCamerieri`**: lettura da repository al posto di `storage.get*`; gestione loading/error/reload; ancora senza rimuovere `storage.ts` dai path di scrittura se serve transizione. | Build + apri CRM Camerieri (anche dati vuoti da DB è ok). |
| **3** | Rimuovere o isolare **`storage.ts`** (localStorage): o delete del percorso online + eventuale **`migrateLocalToRemote` one-shot** documentato — non mescolare con Step 1–2. | Reload: elenco coincide con Table Editor `staff`. |
| **4** | Filare **`CamerieriPage`** / **`CamerieriTable`** / promozione board (`KanbanColumn`/`promoteCandidateToCameriere`) sul repository solo; niente import diretto al vecchio storage. | Promozione da board crea riga su `staff`. |
| **5** | Smoke + **`pnpm build:admin`** end-to-end; due sedi (`modena`/`sassari`). Opzionale: test Vitest dove coperto repo. | Checklist DEVELOPMENT_NOTES smoke Camerieri. |
| **6** | (Opzionale) Completare **`CreateCameriereDialog`** MVP INSERT senza candidato. | Form crea riga `staff` con `source_candidate_id` null. |

L’operatore indica sempre: *«Esegui **Step N** del prompt staff»* (numero esplicito).

### Non fare (fuori scope salvo incarico separato)

- Nuove migrazioni SQL salvo mismatch schema reale ↔ UI (preferire adeguamento codice a schema v1).
- Bucket/storage dedicati staff diversi dai path già gestiti careers (salvo gap di policy documentato).
- Migrazione **campagne** (altro residuo E4).

### Definition of done

- Con login admin attivo, CRUD CRM Camerieri (minimo lettura + insert/update promozione) persiste su **`public.staff`** verificabile in Table Editor Supabase.
- Nessun nuovo uso obbligatorio di `admin:camerieri:crm:v1` nel percorso online (eventuale migrazione one-shot eccezione documentata).

---

### Valutazioni future dopo promozione (candidati)

Il flusso attuale dopo promozione riuscita: **archivio** (`archivio` + sync `pipeline_stage`). In seguito si potrà valutare una di queste strade:

1. **Archivio con tracciamento esplicito:** resta riga in `candidates` in archivio ma con nota / metadata del tipo *«Promozione a staff in data …»* (es. campo in `admin_workflow`, nota operativa, o colonne dedicate se servono report).
2. **Promozione + delete:** rimuovere il candidato dal board (e opzionalmente `DELETE` su `public.candidates`) quando la promozione è idempotente su `staff.source_candidate_id` — implica policy prodotto su storico, FK e audit.

La scelta dipende da esigenze di conformità e da quanta storia deve restare leggibile oltre la tabella **`staff`**.

---

## Storia / tracking

[`docs/IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) (E4) e [`docs/DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) aggiornati con il wiring Camerieri / staff (2026-05-02).

---

## Nota operatore (modello / contesto)

- Con **poco contesto** e step sequenziali: preferire **Composer 1.5** per refactors che toccano tipi, Supabase e più file (più margine su coerenza). **Composer 2 fast** va bene se mantieni **rigorosamente un solo Step per sessione** e verifichi build a mano tra un messaggio e il successivo.
- Aprire **chat nuove** o ruoli separati per Step 3–4 (più rischi di regressione) riduce confusione rispetto a un’unica conversazione lunga.
