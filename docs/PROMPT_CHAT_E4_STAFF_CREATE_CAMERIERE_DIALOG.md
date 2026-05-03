# Prompt — Completare **Crea Cameriere** (`CreateCameriereDialog`)

**Stato (post-implementazione):** `CreateCameriereDialog` è **operativo** (form react-hook-form + zod, tag multi-selezione, **`upsertStaff`** senza `sourceCandidateId`, **`dispatchStaffListInvalidated()`**, toast **sonner** + `<Toaster />` in `admin/src/main.tsx`). **Foto profilo opzionale** dal dialog dopo migrazione Storage **`00170`** e cablaggio repository/UI: vedere **`§ Evoluzione — foto profilo dal dialog`** più sotto e [`PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md`](PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md). Lo step **5 originale dialog** (aria aggiuntiva / estrazione validazione + test Vitest dedicati) resta **opzionale**.

**Storico (pre-implementazione):** la creazione da CRM passava solo dalla **promozione da board** (`staff-promotion.ts` → `upsertStaff`). Il repository supporta ancora INSERT senza candidato nel ramo **`upsertStaff`**.

**Obiettivo originale:** dialog con form minimo → **`upsertStaff({ city, firstName, lastName, … })`** senza FK candidato → **`dispatchStaffListInvalidated()`** per ricaricare la tab CRM.

**Riferimenti:** [`staff-repository.ts`](../admin/src/components/camerieri/staff-repository.ts), [`staff-events.ts`](../admin/src/components/camerieri/staff-events.ts), [`types.ts`](../admin/src/components/camerieri/types.ts), migrazione [`20260501000040_create_staff.sql`](../supabase/migrations/20260501000040_create_staff.sql) (lunghezze nome/cognome, email, telefono, `tags` subset), **`CamerieriPage.tsx`** (prop `city` = slug sede già disponibile).

---

## Prompt (copia da qui)

Sei nel monorepo **g3modena** (`admin/`). Implementa **`CreateCameriereDialog`** completo senza modificare schema DB né RLS salvo errore confermato.

### Vincolo esecuzione — **uno step per volta**

1. Solo **uno** degli step della tabella sotto per messaggio/chat, salvo richiesta esplicita dell’utente.
2. Dopo ogni step: sintesi breve + **`pnpm build:admin`**; **fermati**.

### Contesto tecnico

- **`CameriereCreateInput`**: `city` (slug **`CandidateCitySlug`**, sulla pagina Camerieri è già noto come **`CamerieriPage` prop `city`**), `firstName`, `lastName` obbligatori; email/phone/tag opzionali; **`sourceCandidateId` omesso** per creazione manuale.
- **`upsertStaff`**: quando non c’è `source_candidate_id`, esegue **solo INSERT**; errori FK/constraint già mappati in repository.
- **Tag:** ammessi solo `automunito`, `esperienza`, `multilingue`, `fuori_sede` (`CameriereTag` + CHECK DB).
- **Avatar foto (opzionale):** implementazione separata (bucket **`staff-crm-avatars`** + prefisso path **`crm-staff/`** + dialog): vedere [`PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md`](PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md).
- Dopo INSERT riuscito: **`dispatchStaffListInvalidated()`** da **`staff-events.ts`** così `useCamerieri` ricarica.

### Step suggeriti

| Step | Cosa fare | Verifica |
|------|-----------|---------|
| **1** | Estendere **props** dialog: mantieni `open`/`onOpenChange`; aggiungi **`city: CandidateCitySlug`** (richiesto). Opzionale: **`onCreated?: () => void`** solo se serve oltre l’evento globale — preferire **`dispatchStaffListInvalidated`**. Aggiorna **`CamerieriPage`** passando `city={city}`. | Build; apri/chiudi dialog senza regressione layout. |
| **2** | Form controllato: **nome**, **cognome** (trim, non vuoti); **email** e **telefono** opzionali con validazioni coerenti con CHECK DB (email formato semplificato compatibile Postgres `~*` in migrazione; telefono 4–40 char se compilato); **toggle “Attivo”** default **true**. Usa componenti già nel progetto (es. **`react-hook-form` + zod** se coerente con altre pagine admin, **oppure** `useState` minimo — resta sullo stile esistente in `admin`). | Submit disabilitato con errori chiari (copy italiano breve). |
| **3** | **Tag:** UI multi‑selezione (checkbox o ToggleGroup) ↔ array `tags` ordinato deterministico prima di invio. Default `[]`. | Build; DB accetta combinazioni (subset CHECK). |
| **4** | **`handleSubmit`** async: `setSubmitting(true)`, chiama **`upsertStaff({ city, firstName, lastName, email, phone, isActive, tags })`** (**no** `sourceCandidateId`). Success → toast o messaggio positivo (**sonner** se già nel shell admin), **`dispatchStaffListInvalidated()`**, reset form parziale, `onOpenChange(false)`. Error → `Error` messaggio leggibile (`err instanceof Error`). `finally` submit false. | In Table Editor **`public.staff`** compare nuova riga con `source_candidate_id` **null**. |
| **5** | (Opzionale) **`aria-*`/label** associate agli input; test Vitest molto piccolo su pure function di validazione se estratta in modulo (come `campaign-builder-validation.ts`). | `pnpm exec vitest run --config vitest.config.ts` se aggiungi test. |

### Non fare (salvo incarico nuovo prompt)

- Modificare **`mockCandidates`** o board per questo flusso.
- **`upsert`** con `sourceCandidateId`: è competenza della promozione board.
- Caricare **nuove** foto CRM dal dialog su **`careers-photos`** (uso corretto dopo promozione / path storici); upload dalla creazione CRM = bucket **`staff-crm-avatars`** + **`crm-staff/`** dopo migrazione **[`00170`](../supabase/migrations/20260501000170_e3_storage_staff_crm_avatars.sql)** — vedi [`PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md`](PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md).

### Definition of done

- Da **Camerieri › {sede}** → **Crea Cameriere** → compilazione valida → riga **`staff`** persistente dopo refresh; lista CRM aggiornata senza reload manuale pagina (`useCamerieri`).

---

## Nota modello

Adatto **Composer 1.5** o **2 fast** con **uno step alla volta**. Lo **Step 4** (submit + errori edge) è il più delicato — tenere quel turno corto sul solo file dialog + import esistenti.

---

## Evoluzione — foto profilo dal dialog

Implementazione consegnata (**migrazione + `staff-repository` + campo file nel dialog**):

| Artefatto | Nota |
|-----------|------|
| **Migrazione** | **`20260501000170_e3_storage_staff_crm_avatars.sql`** — bucket privato **`staff-crm-avatars`**, MIME jpeg/png/webp, 5 MB, policy **`authenticated`** su `storage.objects` (select/insert/update/delete). |
| **Codice** | `uploadStaffCrmAvatar`, `STAFF_CRM_AVATARS_BUCKET`, **`STAFF_CRM_AVATAR_PATH_PREFIX`** = **`crm-staff/`**; **`staffApplyAvatarSignedUrls`** distingue `crm-staff/…` vs path **`careers-photos`**; **`CreateCameriereDialog`** — input opzionale, preview blob URL + cleanup revoke. |

**Operatore:** `supabase db push` deve aver applicato **`00170`** prima dello smoke upload. Checklist tecnica completa + definition of done: [`PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md`](PROMPT_CHAT_E4_STAFF_PROFILE_PHOTO_CRM_UPLOAD.md). Note operative: [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) (§ Camerieri, § *Aggiornamento admin — Foto profilo*), [`SMOKE_TEST_ADMIN.md`](SMOKE_TEST_ADMIN.md) § E.

Implementazione storica dei prompt in **step 1–5** sequenziali (questo thread / chat dedicate).

---

## Tracking

- [x] [`SMOKE_TEST_ADMIN.md`](SMOKE_TEST_ADMIN.md) — blocco **E** (Crea Cameriere con/senza foto, badge stato, prerequisito **`00170`** per upload foto).
