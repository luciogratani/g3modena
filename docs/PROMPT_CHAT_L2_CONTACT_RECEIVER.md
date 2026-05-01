# Prompt per chat dedicata — Gate **L2** (form contatti + inbox)

**Stato:** implementato (2026-05-01). Receiver: `supabase/functions/contact-submissions/index.ts`; inbox: `admin/src/components/contact-messages/*` su `contact_messages`; roadmap **`docs/IMPLEMENTATION_ROADMAP.md`** (L2 ✓). Il contenuto sotto resta utile come contesto storico / revisione.

Copia il blocco sotto in una **nuova chat** Cursor solo se serve ripescare il contesto originario.

---

## Prompt (copia da qui)

Sei nel monorepo **g3modena** (`admin/`, `web/`, `supabase/`). **L1** è chiuso (Edge `career-submissions`, Storage careers). **L2** è anch’esso implementato — questo paragrafo è il contesto originario della task (receiver `contact-submissions` + inbox `contact_messages`).

### Obiettivo (due livelli, stesso filo logico)

**L2a — Receiver HTTP**  
Implementare un endpoint che riceve il submit JSON del sito (`web/components/contact-form.tsx`) su `POST` a `import.meta.env.VITE_CONTACT_ENDPOINT` e **persiste** su `public.contact_messages` (`supabase/migrations/20260501000060_create_contact_messages.sql`).

- Il form invia **`Content-Type: application/json`** con chiavi camelCase: `fullName`, `company`, `email`, `phone`, `city`, `message` (vedi `handleSubmit` in `contact-form.tsx`).
- Mappatura colonne DB: `full_name`, `company`, `email`, `phone`, `city`, `message`; `status` deve restare **`nuovo`**; `source` deve restare **`web_contact_form`** (vincoli policy anon).
- Esiste già policy **anon insert** `contact_messages_anon_insert_web_form` in `20260501000110_e2b_policies_anon_public.sql` (`WITH CHECK (source = 'web_contact_form' AND status = 'nuovo')`). Come per L1: se usi **Edge Function + service role**, il service role **bypassa RLS** → replicare in codice gli stessi vincoli (non accettare `status`/`source` dall’esterno).
- Validazione server-side allineata ai **CHECK** SQL (lunghezze email, messaggio 1–5000, telefono se presente, ecc.) + coerenza con i campi obbligatori lato UI (nome, email, telefono, messaggio).

**L2b — Inbox admin su Supabase** (persistenza condivisa; overlap con **E4**)  
Oggi `admin/src/components/contact-messages/*` usa **`localStorage`** (`admin:contact-messages:v1`, `CONTACT_MESSAGES_UPDATED_EVENT`). Per soddisfare L2 “multi-postazione”:

- Lettura lista messaggi da **`contact_messages`** con client Supabase **authenticated** (policy `contact_messages_authenticated_all` in `20260501000100_e2b_policies_authenticated_admin.sql`).
- Aggiornamento `status` (`nuovo` → `letto` / `archiviato`) come **UPDATE** sulle stesse righe.
- Modello UI `ContactMessage` in `admin/src/components/contact-messages/types.ts` (`id`, `fullName`, `company`, …, `createdAt` ISO string): mappare da righe DB (`created_at`, snake_case ↔ camelCase).

Ordine consigliato: **prima L2a** (flusso web → DB verificabile in SQL Editor), **poi L2b** (admin legge/scrive DB). In alternativa parallelo se due persone.

### Architettura suggerita (allineata a L1)

- Nuova Edge Function es. `supabase/functions/contact-submissions/index.ts`: `POST` JSON, CORS (`OPTIONS`), segreti `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, opzionale `CONTACT_ALLOWED_ORIGINS` (stesso schema mentale di `career-submissions`).
- Risposte JSON chiare (`201` + id creato o `400`/`422` validazione); nessun errore “silenzioso” lato utente oltre a quanto già gestito dal `toast` nel form.

### File e contratti da leggere prima di codare

- `web/components/contact-form.tsx`
- `supabase/migrations/20260501000060_create_contact_messages.sql`
- `supabase/migrations/20260501000110_e2b_policies_anon_public.sql` (insert anon)
- `supabase/migrations/20260501000100_e2b_policies_authenticated_admin.sql` (admin CRUD)
- `admin/src/components/contact-messages/storage.ts`, `types.ts`, `useContactMessages.ts`, `ContactMessagesPage.tsx`
- Riferimento pattern L1: `supabase/functions/career-submissions/index.ts`, `supabase/README.md` (deploy/secrets/smoke)

### Problemi ancora da risolvere / rischi

| Area | Dettaglio |
|------|-----------|
| **`session_id`** | Colonna opzionale per correlazione debole con analytics (`contact_messages.session_id`). Il form **non** lo invia oggi; si può omettere in v1 oppure estendere il web con `getOrCreateSessionId()` da `web/lib/analytics.ts` e un campo nel JSON. |
| **Company/city vuoti** | UI: company e city opzionali; DB: `company` nullable, `city` nullable con vincoli se valorizzati — normalizzare stringa vuota → `null` lato server. |
| **Rate limit / spam** | Non in RLS; stesso gap di L1 — strutturare la function per aggiungere throttle/CAPTCHA in seguito. |
| **Mock admin** | `CONTACT_MESSAGES_MOCK` e seed localStorage: definire strategia migrazione (es. prima fetch DB vuota, niente seed automatico in prod). |
| **Tipi `source`** | Solo `web_contact_form` per insert dal sito; policy anon non permette altri `source` al submit pubblico. |

### Domande aperte

1. **Solo Edge** vs altro host per `VITE_CONTACT_ENDPOINT`? (Consiglio: parità con L1.)
2. **L2b subito** nello stesso PR o PR separato dopo smoke L2a?
3. **Notifiche** (email/Slack) fuori scope L2 core o desiderate in MVP?
4. Eliminare del tutto il fallback **localStorage** in admin dopo L2b o tenerlo dietro feature flag per demo offline?

### Definition of done (suggerita)

- Submit dal sito con env produzione crea riga in `contact_messages` verificabile in Supabase.
- Admin autenticato vede gli stessi messaggi da un secondo browser/postazione; cambio stato persiste sul DB.
- `web/.env.example` documenta URL tipo function Supabase per `VITE_CONTACT_ENDPOINT`.
- `supabase/README.md`: istruzioni deploy function **`contact-submissions`**, secrets, smoke (curl).
- Aggiorna `docs/IMPLEMENTATION_ROADMAP.md` (**L2** ✓) e `docs/DEVELOPMENT_NOTES.md` (sezione contatti/messaggi).

---

## Passi manuali (dopo implementazione L2 — operativi)

Come per L1: `supabase db push` se aggiungi migrazioni; `supabase secrets set …`; `supabase functions deploy contact-submissions`; in build/hosting web impostare `VITE_CONTACT_ENDPOINT` all’URL della function. Nessun bucket Storage obbligatorio per il solo form testo.

---

## Nota uso

Dopo aver completato **L2**, aggiorna la checkbox **L2** in `docs/IMPLEMENTATION_ROADMAP.md` e il footer “Ultimo aggiornamento checklist”.
