# Prompt per chat dedicata — Gate **L1** (receiver candidature)

**Stato:** implementato (2026-05-01). Receiver: `supabase/functions/career-submissions/index.ts`; Storage: `supabase/migrations/20260501000140_e3_storage_careers.sql`; roadmap `docs/IMPLEMENTATION_ROADMAP.md` (L1 ✓). Il contenuto sotto resta utile come contesto storico / revisione.

Copia il blocco sotto in una **nuova chat** Cursor e incolla contesto file quando richiesto.

---

## Prompt (copia da qui)

Sei nel monorepo **g3modena** (`admin/`, `web/`, `supabase/`). Roadmap aggiornata in `docs/IMPLEMENTATION_ROADMAP.md`: **E2 (RLS)**, **E5 (Auth admin)** e **L4** sono chiusi; il prossimo passo bloccante per la produzione è **L1 — receiver candidature** (`VITE_CAREER_ENDPOINT`).

### Obiettivo

Implementare un **backend/receiver** che:

1. Riceve il submit dal sito (`web/components/careers-form.tsx`) via **`fetch`** verso `import.meta.env.VITE_CAREER_ENDPOINT`, sia **JSON** sia **multipart** (`buildCareerJsonPayload` / `buildCareerMultipartPayload`).
2. **Persiste** su Postgres/Supabase nella tabella **`public.candidates`** tutti i campi previsti dallo schema (`supabase/migrations/20260501000030_create_candidates.sql` + alter discard `0080`).
3. Gestisce **`officeCitySlug`** → **`city_id`** (FK obbligatoria): la tabella `candidates` non ha slug diretto; serve lookup su **`public.cities`** (righe **attive**). Il web valida contro `web/data/application-office-cities.ts`; il server deve validare contro la **sorgente canonica** (oggi mismatch con admin locale `admin:cities:v1` fino a **E4**).
4. Persiste **attribution**: `cid` + `utmSource` / `utmMedium` / `utmCampaign` / `utmTerm` / `utmContent` nelle colonne `utm_*` e, se previsto dal concept, risolve **`campaign_id`** da `cid` (vedi migrazione `20260501000120_e2b_campaign_lookup_bridge.sql` e `docs/DB_CMS_INTEGRATION.md` / `PRE_WIRING_CONCEPT.md`).
5. Receiver con **Edge Function + `SUPABASE_SERVICE_ROLE_KEY`** (scelta consigliata nel piano L1): il **service role bypassa RLS** su Postgres; le policy anon **non** filtrano l’insert. **Obbligo:** la validazione applicativa deve **rispecchiare** i guardrail di `candidates_anon_insert_web_submit` (`20260501000110_e2b_policies_anon_public.sql`): `pipeline_stage = 'nuovo'`, colonne discard tutte null, `privacy_consent_accepted = true`, `city_id` che punta a `cities` con `is_active = true`. Alternativa meno usata qui: insert diretto dal browser come **anon** (RLS si applica), con trade-off su multipart/segreti.

### File e contratti da leggere prima di codare

- `web/components/careers-form.tsx` (submit, payload, TODO `wiring`)
- `supabase/migrations/20260501000030_create_candidates.sql`
- `supabase/migrations/20260501000110_e2b_policies_anon_public.sql` (policy insert anon)
- `supabase/migrations/20260501000120_e2b_campaign_lookup_bridge.sql`
- `docs/DB_CMS_INTEGRATION.md` (mapping campi)
- `docs/PRE_WIRING_CONCEPT.md` (policy attribution)
- `web/.env.example` (`VITE_CAREER_ENDPOINT`)

### Problemi ancora da risolvere (blocchi / rischi)

| Area | Dettaglio |
|------|-----------|
| **Allegati** | Colonne `profile_photo_path`, `cv_path` pensate per **Storage** (**E3** non fatto). Multipart invia file binari: serve upload bucket + path nel row, oppure storage esterno temporaneo. |
| **JSON vs PDF CV** | Payload JSON usa `cvPreviewUrl` solo per PDF preview; il receiver deve definire comportamento se non c’è file binario (accettabile solo come step intermedio). |
| **`registration_duration_seconds`** | Non risulta ancora nel payload del form; colonna DB nullable — decidere se calcolarlo lato client e inviarlo o omettere in v1. |
| **Rate limit / anti-spam** | Esplicitamente fuori dagli scope attuali delle migrazioni; va progettato nel receiver (Edge middleware, CAPTCHA, throttle IP/email, ecc.). |
| **Seed `cities`** | Il receiver deve risolvere slug → `city_id` su sedi **`is_active = true`**. Se la tabella è vuota o gli slug non coincidono col web, ogni submit fallisce: serve migrazione seed, INSERT operativo, o **E4**.
| **Allineamento slug web ↔ DB** | Finché **E4** non sincronizza sedi admin con `cities`, il receiver deve definire cosa è “slug valido” (solo DB? whitelist deploy?). |
| **RPC `resolve_campaign_id_from_cid`** | Oggi ha `GRANT EXECUTE` a `anon` e `authenticated` (`00120`). Su Edge con service role di solito funziona; se compare **`permission denied`**, aggiungere in migrazione `GRANT EXECUTE ON FUNCTION public.resolve_campaign_id_from_cid(text) TO service_role` (o equivalente secondo convenzione progetto). |

### Domande aperte (decidere con il PM / prima dell’implementazione)

1. **Stack del receiver:** Supabase **Edge Function** (Deno) vs **altro host** (es. Vercel serverless) vs **insert diretto** da `web` con Supabase JS anon?
2. **Autenticazione verso DB:** solo **service role** server-side (preferibile per segreti e logica) vs pubblico anon dal browser?
3. **`campaign_id`:** risoluzione sempre da `cid` tramite funzione bridge SQL o logica applicativa duplicata?
4. **Duplicati:** stessa email multi-submit — idempotenza, vincolo univoco, o accettato come storico?
5. **`officeCitySlug` vs residenza:** confermare mapping `city` (form) → colonna `residence_city` senza ambiguità con sede di candidatura.

### Definition of done (suggerita)

- Submit reale dal sito (multipart con foto/CV quando presenti) crea riga in `candidates` con tutti i campi business popolati e attribution coerente.
- Errore chiaro lato utente se endpoint down / validazione fallita; nessun silent failure.
- Documentazione breve in `docs/DEVELOPMENT_NOTES.md` o `supabase/README.md` su URL deploy, env, e dipendenza da seed `cities` / **E3**.

---

## Note revisione (checklist implementazione)

Da tenere allineate al codice mentre si procede (non è necessario ricopiare tutto nella chat):

1. **Mirror dei vincoli policy anon** — Con insert via service role, replicare esplicitamente in Edge gli stessi controlli della `WITH CHECK` su `candidates` (oltre a formati/email/età/file), così non si introduce uno spiraglio più largo del submit pubblico previsto da schema.
2. **Grant RPC** — Verificare la prima chiamata a `resolve_campaign_id_from_cid`; se serve, migrazione dedicata con `GRANT EXECUTE … TO service_role`.
3. **Path Storage + UUID** — Opzione robusta: generare l’UUID candidato prima dell’upload, usare `{uuid}/profile-photo.<ext>` e `{uuid}/cv.<ext>`, poi `INSERT` con quello stesso `id` (compatibile con default `gen_random_uuid()` sul resto dei flussi).
4. **Limiti file** — Allineati al form: immagini JPEG/PNG/WEBP max 5 MB; CV solo PDF max 10 MB (`careers-form.tsx`).

---

## Nota uso

Dopo aver completato **L1**, aggiorna la checkbox **L1** in `docs/IMPLEMENTATION_ROADMAP.md` e il footer “Ultimo aggiornamento checklist”.
