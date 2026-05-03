# Prompt — Foto profilo in **Crea Cameriere** (Storage + CRM)

**Scopo:** consentire nell’omonimo dialog (`CreateCameriereDialog`) un **upload opzionale** di immagine profilo, persistendo **`public.staff.avatar_path`** come nel flusso **promozione da candidato** (path bucket + signed URL in tabella CRM).

**Vincoli di prodotto / sicurezza**

- Il bucket **`careers-photos`** oggi consente **`authenticated`** solo **`SELECT`**; gli upload pubblici passano dalla Edge L1 (**service role**). **Non** aprire INSERT indiscriminato su quel bucket dal browser admin senza predicato di path mirato — rischio namespace con allegati candidature.
- **Convenzione adottata in questo prompt (obbligatoria):**
  - **Nuovo bucket privato** `staff-crm-avatars` (stesso schema di `campaign-previews`): solo admin autenticato, CRUD oggetti.
  - **`avatar_path`** per foto caricate dal dialog CRM: oggetti con **prefisso fisso** `crm-staff/` (es. `crm-staff/<uuid>.webp`) così nel codice si distingue nettamente dai path **`careers-photos`** usati dopo promozione candidato.

**Riferimenti:** [`admin/src/components/camerieri/staff-repository.ts`](../admin/src/components/camerieri/staff-repository.ts), [`admin/src/components/camerieri/CreateCameriereDialog.tsx`](../admin/src/components/camerieri/CreateCameriereDialog.tsx); migrazione bucket [`supabase/migrations/20260501000170_e3_storage_staff_crm_avatars.sql`](../supabase/migrations/20260501000170_e3_storage_staff_crm_avatars.sql); migrazione modello policy/storage [`supabase/migrations/20260501000160_e3_storage_campaign_previews.sql`](../supabase/migrations/20260501000160_e3_storage_campaign_previews.sql); dialog CRM storico [`PROMPT_CHAT_E4_STAFF_CREATE_CAMERIERE_DIALOG.md`](PROMPT_CHAT_E4_STAFF_CREATE_CAMERIERE_DIALOG.md); [`supabase/README.md`](../supabase/README.md).

---

## Prompt (copia da qui — **uno step alla volta**)

Implementa l’upload foto opzionale per **Crea Cameriere** seguendo la convenzione sopra.

### Regole di esecuzione

1. Esegui **un solo numero di step** dalla tabella sotto per messaggio/chat.
2. Fine turno: sintesi breve (file toccati) + **`pnpm build:admin`**; **fermati** e attendi «procedi Step N+1».

---

### Tabella step

| Step | Contenuto | Verifica |
|------|-----------|-----------|
| **1** | **Solo migrazione + README:** nuovo file `supabase/migrations/20260501000170_e3_storage_staff_crm_avatars.sql` — bucket **`staff-crm-avatars`** (privato, limite MB e MIME jpeg/png/webp); policy **`storage.objects`** per **`authenticated`** su **select / insert / update / delete** con `bucket_id = 'staff-crm-avatars'`. Aggiorna albero e note in **`supabase/README.md`** fino **`00170`**. | Diff SQL revisionabile; build monorepo se necessario cosmetico. |
| **2** | **Solo `staff-repository.ts`:** costanti `STAFF_CRM_AVATARS_BUCKET`, **`STAFF_CRM_AVATAR_PATH_PREFIX`** = **`crm-staff/`**; funzione **`uploadStaffCrmAvatar(file)`** (stile `uploadCampaignCreative`: MIME, dimensione max, path `crm-staff/<uuid>.<ext>`); aggiorna **`staffApplyAvatarSignedUrls`**: path che **iniziano** con il prefisso → `createSignedUrl` da **`staff-crm-avatars`**, altrimenti **`careers-photos`** come oggi. | `pnpm build:admin`; nessun cambio al dialog. |
| **3** | **`CreateCameriereDialog`:** input file opzionale + preview **`URL.createObjectURL`** / **`revokeObjectURL`** in cleanup; submit = se file → **`uploadStaffCrmAvatar`** poi **`upsertStaff`** con **`avatarUrl`** = path restituito; senza file come oggi. Errori upload in UI (**`toast`** + stato). | Smoke manuale: riga **`staff.avatar_path`** inizia con **`crm-staff/`** e avatar visibile dopo reload lista. |
| **4** | **(Opzionale)** Test Vitest su helper puro **`path` → bucket previsto**, oppure skip e solo **`SMOKE_TEST_ADMIN`** § CRM. | `vitest run` se aggiunto test. |
| **5** | **Doc:** `DEVELOPMENT_NOTES`, link da [`PROMPT_CHAT_E4_STAFF_CREATE_CAMERIERE_DIALOG.md`](PROMPT_CHAT_E4_STAFF_CREATE_CAMERIERE_DIALOG.md) (footer: foto dopo **`00170`**); smoke checklist. | Coerenza link interni. |

---

### Non fare

- Modificare L1 / **`career-submissions`** senza incarico dedicato.
- Persistere **`data:`** URL o signed URL lunghi in **`avatar_path`**.

### Definition of done

- Migrazione **`00170`** in repo; dopo **`db push`** remoto bucket operativo.
- **Crea Cameriere** con foto usa **`staff-crm-avatars`** + prefisso **`crm-staff/`**; board/promozione continua su path **`careers-photos`** invariati nel comportamento.

---

## Modello

**Composer 1.5** adatto seguendo **Step 1 → 5** in ordine separato.

---

## Post-deploy (operatore)

```text
[ ] supabase db push → include 20260501000170
[ ] Smoke: Creazione cameriere con immagine → verifica bucket + Table Editor staff
```

