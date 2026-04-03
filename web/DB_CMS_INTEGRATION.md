# Web DB/CMS Integration Notes

Documento tecnico per chat/agent durante:
- collegamento reale a Supabase (DB + Storage)
- sviluppo sezione admin
- passaggio da contenuti hardcoded a CMS

Questo file descrive lo stato reale della app `web` oggi e il contratto dati da rispettare quando si collega il backend.

---

## 1) Stato attuale certo (web)

- App `web` e una SPA React/Vite.
- I contenuti pagina sono locali in `web/data/site-content.ts`.
- Il rendering usa `siteContent` direttamente in `web/src/App.tsx`.
- Esiste gia un adapter pronto per DB in `web/lib/content-adapter.ts`:
  - `adaptSiteContent(rows)` normalizza e valida i dati
  - `loadSiteContent({ tenantSchema, fetchSections })` ha fallback a contenuti locali
- Form pubblici usano endpoint HTTP esterni:
  - `VITE_CONTACT_ENDPOINT`
  - `VITE_CAREER_ENDPOINT`
- Al momento `web` NON usa client Supabase.

Nota: nel monorepo esiste `admin/src/lib/supabase.ts` con env Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), ma non implica che web sia gia collegata.

---

## 2) Contratto contenuti web (source of truth)

Il modello tipizzato e in `web/data/site-content.ts` (`SiteContent`):

- `hero`
- `about`
- `clients`
- `whyG3`
- `footer`
- `seo` (`metaTitle`, `metaDescription`, canonical/OG/robots)
- `sections` (`contactForm.enabled`, `careersForm.enabled`)

Quando il CMS fornisce dati, la forma finale deve restare compatibile con `SiteContent`.

---

## 3) Section keys supportate dal parser web

`adaptSiteContent()` accetta le seguenti chiavi sezione:

- `hero`
- `about`
- `clients`
- `why_g3` (oppure `whyG3`)
- `footer`
- `seo`
- `sections`
  - supporta anche alias:
    - `contactForm` o `contact_form`
    - `careersForm` o `careers_form`

Regola pratica: nel DB/CMS mantenere una convention stabile (consigliata snake_case lato tabella, con mapping esplicito).

---

## 4) Strategia consigliata per DB (Supabase)

### Obiettivo minimo

Consentire a `web` di leggere contenuti per tenant con fallback locale.

### Schema logico consigliato (proposta)

Tabella contenuti sezioni (esempio):

- `tenant_schema` (text) oppure `tenant_id` (uuid/text)
- `section_key` (text)
- `content` (jsonb)
- `is_published` (bool)
- `updated_at` (timestamp)

Vincoli minimi:

- unique (`tenant_schema`, `section_key`)
- check su `section_key` (set limitato)

---

## 5) Strategia consigliata per Storage (Supabase)

Per ora NON collegare in produzione finche non serve.

Quando servira:

- bucket separati per tipo contenuto (es. `site-media`, `careers-cv`, `careers-photos`)
- naming file con prefisso tenant e data (`tenant/...`)
- policy RLS/storage con permessi minimi:
  - pubblico read solo dove necessario (es. hero image/video pubblici)
  - upload candidati controllato (idealmente signed upload)

---

## 6) Contratto Admin -> Web

Admin deve produrre dati compatibili con `SiteContent` + section keys supportate.

Checklist per ogni sezione:

- campi obbligatori presenti
- tipi corretti (string, array, boolean)
- enum validi (es. `whyG3.icon`: `clock|crown|users|shield-check`)
- URL/href coerenti

Se un campo manca o e invalido, il web adapter usa fallback locale (comportamento voluto).

---

## 7) Piano collegamento reale (sequenza sicura)

1. Tenere `web` in fallback locale (stato attuale).
2. Collegare prima `admin` a Supabase per CRUD contenuti.
3. Popolare sezioni base (`hero/about/clients/why_g3/footer/seo/sections`) per un tenant.
4. Integrare `web` con `loadSiteContent()` usando `fetchSections`.
5. Abilitare feature flag per switch locale/DB.
6. Solo dopo: collegare upload media/storage reali.

---

## 8) Env vars attese

### Web (attuali)

- `VITE_CONTACT_ENDPOINT`
- `VITE_CAREER_ENDPOINT`

### Web (future, quando si collega Supabase)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TENANT_SCHEMA` (oppure `VITE_TENANT_ID`)

### Admin (gia previste)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 9) Regole per chat/agent (important)

Quando una chat lavora su DB/CMS:

- non rimuovere fallback locale in `site-content.ts` finche il backend non e stabile
- non cambiare i nomi sezione senza aggiornare `content-adapter.ts`
- non introdurre nuovi enum/icona senza aggiornare validazione adapter
- mantenere backward compatibility (alias chiavi gia supportati)
- validare sempre build web dopo modifiche a modello contenuti

---

## 10) File chiave da conoscere

- `web/data/site-content.ts`
- `web/lib/content-adapter.ts`
- `web/src/App.tsx`
- `web/components/careers-form.tsx`
- `admin/src/lib/supabase.ts`

Questo documento va aggiornato ogni volta che cambia il contratto dati tra web e admin.
