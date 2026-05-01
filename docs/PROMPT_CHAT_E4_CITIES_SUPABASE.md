# Prompt per chat dedicata — **E4 (prima fetta): sedi `cities` su Supabase**

**Stato:** implementato (2026-05-01). Admin **`public.cities`** autenticato; careers da REST anon + fallback statico; **`admin:cities:updated`** mantenuto senza import da `admin:cities:v1`. Roadmap / note in **`docs/IMPLEMENTATION_ROADMAP.md`**, **`docs/DEVELOPMENT_NOTES.md`**.

Il blocco sotto è **contesto storico** per revisioni o nuove chat.

---

## Prompt (copia da qui)

Sei nel monorepo **g3modena**. **L1** usa **`public.cities`** per `officeCitySlug` → `city_id`. **L2** è fatto. **Implementato:** admin **Config › Sedi** su Supabase; web legge sedi attive via anon con fallback **`application-office-cities.ts`** se env/fetch non disponibili.

### Obiettivo

Portare **Config › Sedi** alla **tabella `public.cities`** come fonte operativa per il gestionale (adapter **E4**, prima fetta):

1. **Lettura/scrittura CRUD** da admin usando il client Supabase **authenticated** (policy `cities_authenticated_all` + grant in `20260501000100` / `00130`).
2. **`listActiveCities()`** e tutti i consumatori (**sidebar Candidati/Camerieri**, **`App.tsx`**, badge, ecc.) devono leggere da Supabase (con fallback o migrazione one-shot dal vecchio localStorage solo se serve la prima volta — decidere esplicitamente).
3. Mantieni il **contratto UI** attuale dove possibile: tipo `OfficeCity` (`id`, `slug`, `displayName`, `isActive`, `sortOrder`) mappato da colonne DB (`id` UUID, `slug`, `display_name`, `is_active`, `sort_order`).
4. **Regole prodotto:** oggi **`LEGACY_LOCKED_SLUGS`** (`modena`, `sassari`) impedisce eliminazioni nello storage locale. Con il DB valuta: stessa policy in UI, oppure solo vincoli FK (`candidates.city_id`) + messaggio chiaro all’utente se non si può cancellare per riferimenti.
5. **Ordinamento:** coerenza con `sort_order` DB; operazioni “su/giù” come oggi possono diventare UPDATE di `sort_order` o reorder batch.

### Fase web (consigliata subito dopo o nello stesso filo)

Sostituire (o integrare dietro flag) **`application-office-cities.ts`** con fetch **anon** verso `cities`: RLS permette **`SELECT` solo `is_active = true`** (`cities_anon_select_active` in `20260501000110`). Il form candidature deve elencare le stesse sedi che il DB accetta per **L1**, così non c’è più drift manuale.

### File da leggere prima di codare

- `supabase/migrations/20260501000010_create_cities.sql`
- `supabase/migrations/20260501000110_e2b_policies_anon_public.sql` (anon su `cities`)
- `supabase/migrations/20260501000100_e2b_policies_authenticated_admin.sql` (authenticated su `cities`)
- `admin/src/components/cities/storage.ts`, `CitiesPage.tsx`, `types.ts`
- `admin/src/App.tsx` (import `listActiveCities`, eventi `CITIES_UPDATED_EVENT`)
- `web/data/application-office-cities.ts`, `web/components/careers-form.tsx` (uso sedi)
- `admin/src/lib/supabase.ts` (o dove vive il client Supabase admin)

### Rischi / problemi aperti

| Tema | Nota |
|------|------|
| **DB vuoto** | Senza INSERT iniziale le sedi non esistono; prevedere seed documentato, script, o migrazione SQL **solo dati sedi** concordata (oggi le migrazioni schema sono no-mock). |
| **UUID vs id string** | Il modello locale usa `id` stringa fissa nei seed; in DB gli id saranno UUID reali aggiornati dopo sync — nessun hardcoding degli id legacy nel codice nuovo. |
| **Evento `admin:cities:updated`** | Decidi se mantenerlo dopo fetch Supabase per compatibilità con listener esistenti o sostituire con invalidate/query (React Query / stato locale). |
| **Offline / errore rete** | UX di loading ed errore sulla pagina Sedi e sulla sidebar (come già fatto per inbox messaggi). |

### Domande da risolvere in implementazione

1. Prima sincronizzazione: **import una tantum** da `localStorage` vs **solo DB** e reset manuale?
2. Il web legge le sedi **sempre da API** al boot o si cache-a in sessione?
3. Camerieri **`SUPPORTED_WAITER_CITY_SLUGS`**: resta hardcoded finché lo staff CRM non è multi-sede?

### Definition of done

- CRUD Sedi in admin persiste su **`public.cities`**; ricarica pagina mostra dati DB.
- Sidebar e board continuano a ricevere la lista sedi coerente dal nuovo adapter.
- Form careers sul web usa la lista da Supabase **oppure** è documentato esplicitamente il fallback statico ancora attivo (preferibile chiuderlo nello stesso task).
- Aggiorna **`docs/DEVELOPMENT_NOTES.md`** e una riga in **`docs/IMPLEMENTATION_ROADMAP.md`** sotto **E4**.
- Build: `pnpm --filter admin build` e `pnpm --filter web build`.

---

## Deploy / prerequisiti

Stesso progetto Supabase già usato per Auth/L1/L2; nessuna nuova Edge Function obbligatoria. Assicurati che in **`public.cities`** esistano le righe necessarie prima di test end-to-end con **L1** in produzione.

---

## Nota uso

Dopo il merge: link incrociato opzionale da **`docs/IMPLEMENTATION_ROADMAP.md`** (voce **E4**) a questo file.
