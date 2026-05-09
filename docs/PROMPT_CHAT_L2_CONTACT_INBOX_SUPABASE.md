# Prompt Chat - L2 inbox contatti su Supabase (admin)

Contesto: monorepo `g3modena` (`admin`, `web`, `supabase`).

**Stato:** completato (2026-05-09). Questo prompt resta come runbook storico/ripetibile.

Stato verificato:

- Receiver web `contact-submissions` esiste ed è deployabile.
- `Contatti > Messaggi` in admin usa ancora mock/localStorage (`admin:contact-messages:v1`), con badge "Demo operativa".

Obiettivo: completare **L2 lato inbox admin**, sostituendo il mock con lettura/scrittura reale su `public.contact_messages`.

---

## Decisioni bloccate (non ridiscutere)

1. Niente fallback demo in produzione: usare Supabase come unica sorgente dati.
2. Mantenere status `nuovo | letto | archiviato`.
3. Mantenere UX attuale (toolbar, tabella, detail sheet), cambiando solo il data source.
4. Errori rete/DB gestiti con stati `loading/empty/error` robusti (niente crash).

---

## Modalita esecuzione

Esegui uno step per volta. A fine step: file toccati, verifica, stato chiusura.

---

## Step 1 - Audit mirato (read-only)

1. Mappare i file contatti attuali (`contact-messages/*`).
2. Identificare punti mock/localStorage da rimuovere.
3. Verificare schema atteso `public.contact_messages` e policy authenticated.

Done:

- elenco chiaro dei moduli da sostituire con repository Supabase.

---

## Step 2 - Repository Supabase contatti

1. Creare modulo repository dedicato (es. `contact-messages-repository.ts`).
2. Implementare:
   - `listContactMessages()` ordinati per `created_at desc`,
   - `updateContactMessageStatus(id, status)`.
3. Mapping snake_case -> tipo UI `ContactMessage`.

Done:

- repository compilato, testabile in isolamento.

---

## Step 3 - Hook e pagina inbox

1. Aggiornare `useContactMessages` per usare repository async.
2. Introdurre stato `loading/error/retry`.
3. Rimuovere badge/testo "Demo operativa".

Done:

- pagina inbox legge da DB e aggiorna status su DB.

---

## Step 4 - Pulizia legacy locale

1. Rimuovere dipendenze a `CONTACT_MESSAGES_MOCK` e `admin:contact-messages:v1` dal percorso online.
2. Conservare eventuali helper legacy solo se esplicitamente utili alla migrazione (altrimenti eliminare).
3. Mantenere evento sidebar `CONTACT_MESSAGES_UPDATED_EVENT` se ancora necessario per badge.

Done:

- nessun mock/localStorage nel percorso runtime inbox.

---

## Step 5 - Smoke + build

1. Verifica inbox con DB:
   - lista caricata,
   - filtro ricerca/stato,
   - cambio stato persistito.
2. Verifica badge "Messaggi" in sidebar coerente.
3. Eseguire `pnpm build:admin`.

Done:

- build verde + smoke funzionale completo.

---

## Step 6 - Docs allineate

Aggiornare:

- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/DEVELOPMENT_NOTES.md`
- (se necessario) `docs/PROMPT_CHAT_L2_CONTACT_RECEIVER.md` con stato receiver vs inbox.

Output finale:

1. file toccati,
2. verifiche fatte,
3. eventuali rischi residui.

---

## Vincoli

- Non modificare Edge receiver `contact-submissions` salvo bug reale.
- Non introdurre dipendenze nuove non necessarie.
- Niente seed business nelle migrazioni.
