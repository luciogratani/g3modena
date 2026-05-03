# Prompt — Completare **Crea Cameriere** (`CreateCameriereDialog`)

**Stato (post-implementazione, 2026-05-03):** `CreateCameriereDialog` è **operativo** (form react-hook-form + zod, tag multi-selezione, submit **`upsertStaff`** senza `sourceCandidateId`, **`dispatchStaffListInvalidated()`**, toast **sonner** + `<Toaster />` in `admin/src/main.tsx`). Lo step **5** (aria aggiuntiva / estrazione validazione + test Vitest dedicati) resta **opzionale**.

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
- **Avatar foto (opzionale MVP):** se non fai upload in questo task, **`avatarUrl` omesso**. Se lo includi: niente URL firmati in colonna (`staffAvatarUrlToPersistencePath`) — eventualmente solo path bucket come per promozioni o fase successiva dedicata allo storage staff.
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
- Upload foto obbligatorio se non sei pronto su path/storage — lascia fuori dall’MVP dialog.

### Definition of done

- Da **Camerieri › {sede}** → **Crea Cameriere** → compilazione valida → riga **`staff`** persistente dopo refresh; lista CRM aggiornata senza reload manuale pagina (`useCamerieri`).

---

## Nota modello

Adatto **Composer 1.5** o **2 fast** con **uno step alla volta**. Lo **Step 4** (submit + errori edge) è il più delicato — tenere quel turno corto sul solo file dialog + import esistenti.

---

## Tracking

- [x] [`docs/DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) — sezione Camerieri (dialog + repository + smoke).
- [x] [`docs/SMOKE_TEST_ADMIN.md`](SMOKE_TEST_ADMIN.md) — blocco **E** (Crea Cameriere + badge stato).
