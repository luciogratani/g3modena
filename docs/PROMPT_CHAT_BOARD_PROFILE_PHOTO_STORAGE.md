# Prompt per chat dedicata — **Foto profilo board vs Storage privato**

**Contesto:** submit careers (**L1** / Edge **`career-submissions`**) ok: foto su bucket **`careers-photos`**, colonna **`public.candidates.profile_photo_path`** valorizzata. In admin la kanban non mostra l’avatar.

**Ipotesi principale:** il DB salva una **chiave oggetto** (path nel bucket), non un URL pubblico; il bucket è **privato** (`20260501000140_e3_storage_careers.sql`). `<img src={...}>` con quel path fallisce — serve **`storage.from(...).createSignedUrl`** (o rendere pubblico il bucket, sconsigliato se si vuole restare privati).

Copia il blocco **«Prompt (copia da qui)»** in una nuova chat Cursor.

---

## Prompt (copia da qui)

Sei nel monorepo **g3modena**.

### Sintomo

Dopo una candidatura dal web: **`profile_photo_path`** è valorizzato e il file è presente su Storage, ma **`CandidatiBoard`** / **`CandidateCard`** / **`WorkflowDrawerLane`** / **`CandidateDetailSheet`** non mostrano la foto (fallback iniziali o immagine rotta).

### Cosa verificare (ordine suggerito)

1. **Formato salvato su DB**  
   In **`supabase/functions/career-submissions/index.ts`**, **`uploadAttachment`** restituisce solo la path tipo  
   `{candidateId}/profile-photo.{jpg|png|webp}` — **non** un URL `https://...`. Confermare che la UI non si aspetti un URL assoluto senza trasformazione.

2. **Mapping verso il modello UI**  
   In **`admin/src/components/candidati-board/candidates-repository.ts`**, **`rowToCandidate`** imposta  
   `profileImage: blob.profileImage ?? row.profile_photo_path ?? ""`.  
   Quindi **`profileImage`** può essere una path Storage: i componenti React usano quella stringa come **`src`** — inaccettabile per bucket privato senza firma.

3. **Politiche Storage**  
   Leggere migrazione **`20260501000140_e3_storage_careers.sql`**: bucket privato + read per **`authenticated`**. L’admin usa sessione utente — ok per **`createSignedUrl`** se RLS/policy lo consentono.

4. **Punto di fix consigliato**  
   - Dopo **`listByCity`** (o equivalente che mappa `rowToCandidate`), per ogni candidato con `profile_photo_path` e senza `blob.profileImage` già URL, chiamare il client Supabase autenticato:  
     `storage.from('careers-photos').createSignedUrl(path, expiresIn)`  
     e usare quell’URL come **`profileImage`** in memoria **solo per la UI**.  
   - Oppure componente **`Avatar`** / hook che riceve **path** e risolve signed URL con cache breve (evitare N+1 se possibile con batch o batching limitato).  
   - Non scrivere URL firmati permanenti in **`admin_workflow`** o DB se evitabile (scadenza).

5. **Edge / web**  
   Il fix è lato **admin**; **`web/lib/supabase-edge-invoke-headers.ts`** (invocazione L1 con `Authorization` + `apikey`) è già un contesto separato — non è la causa della mancata visualizzazione in board.

### File già utili

- `admin/src/components/candidati-board/candidates-repository.ts` — `rowToCandidate`, `listByCity`
- `admin/src/components/candidati-board/CandidateCard.tsx` — `src={candidate.profileImage}`
- `admin/src/components/candidati-board/WorkflowDrawerLane.tsx`, `CandidateDetailSheet.tsx`
- `supabase/functions/career-submissions/index.ts` — `PHOTO_BUCKET`, `uploadAttachment`
- `supabase/migrations/20260501000140_e3_storage_careers.sql`

### Definition of done

- Card board e drawer mostrano la foto per candidati creati da L1 con foto, **senza** rendere pubblico il bucket.
- Aggiornare o aggiungere test mirati (`admin/tests/board/`) se si introduce logica di risoluzione URL; altrimenti nota breve in **`docs/DEVELOPMENT_NOTES.md`** sul fatto che **`profileImage`** in UI può essere signed URL temporaneo.
- **`pnpm --filter admin build`** e test board pertinenti verdi.

---

## Nota uso

Dopo il fix: incrociare con roadmap **`E4` / `L5`** se la board documenta allegati.
