# Smoke test — Admin (`g3modena`)

Checklist **manuale** rapida dopo deploy o prima di un rilascio. Ordine suggerito: prerequisiti → blocchi **A→G**. Segna le caselle mentre procedi.

**Tempo indicativo:** ~20–35 minuti (dipende da dati sul DB).

---

## Prerequisiti

- [ ] **Ambiente:** `pnpm dev:admin` in locale **oppure** deploy preview/prod caricato nel browser.
- [ ] **`admin/.env` / `.env.local`:** presenti `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (vedi `admin/.env.example`).
- [ ] **`public.cities`:** nel progetto Supabase esistono almeno **due** righe **`is_active = true`** con `slug` coerenti tra loro e con eventuali prove L1/form web (Table Editor Supabase → `cities`).
- [ ] **Account:** credenziali admin valide per il progetto Auth collegato.

---

## A — Shell e Auth (~2 min)

- [ ] Apri il gestionale: senza login compare **pagina login** (non errore vuoto infinito).
- [ ] **Login:** accesso OK, sidebar e header caricati (nessuno schermo solo bianco dopo redirect interno).
- [ ] **Logout** (se esposto da Impostazioni): torna al login o stato non autenticato coerente.

---

## B — Config › Sedi (`public.cities`) (~3 min)

- [ ] Dal menu apri **Config › Sedi** (`CitiesPage`).
- [ ] Lista sedi corrisponde a quanto vedi in Table Editor **`cities`** (slug, nomi, attivo).
- [ ] **Modifica** una sede non legacy (o solo `display_name` / ordine): salva senza errore, **reload** pagina: modifica ancora visibile.
- [ ] **Legacy:** per slug `modena` / `sassari` l’**eliminazione** resta bloccata o rifiutata con messaggio chiaro (policy prodotto).
- [ ] Opzionale: dopo una modifica sedi, la **sidebar Candidati** si aggiorna (stesse slug attive) senza errore JavaScript in console grave.

---

## C — Sidebar Candidati / Camerieri (~2 min)

- [ ] Sotto **Candidati**, compaiono voci per **ogni sede attiva** da `listActiveCities()` (non solo due fisse).
- [ ] Sotto **Camerieri**, le voci coincidono con le **stesse** sedi attive (liste allineate).
- [ ] Clic su una sede **Candidati** → board della slug corretta (titolo coerente).
- [ ] Clic sulla **stessa** slug sotto **Camerieri** → CRM camerieri per quella slug (lista carica senza errore anche se vuota).

---

## D — Board candidati (~5 min)

- [ ] Board si **carica** (nessun banner “Errore di caricamento” persistente); comparono colonne e card.
- [ ] Apri una **scheda** candidato (sheet): dati leggibili, niente crash aprendo/chiudendo.
- [ ] **Persistenza:** sposta un candidato (DnD **o** archivia poi ripristina) in modo sicuro per i dati; **ricarica la pagina (F5)**: posizione/colonna riflette il salvataggio (writeback Supabase OK).
- [ ] Badge **Nuovo** (se hai candidati in stato `nuovo`): numero plausibile; opzionale: dopo spostamento fuori da `nuovo`, il conteggio si aggiorna dopo evento / focus.

---

## E — Camerieri CRM (`public.staff`) (~4 min)

- [ ] Lista camerieri per una sede: **loading** al primo ingresso poi tabella (anche vuota) senza pannello rosso “Caricamento non riuscito”.
- [ ] Se ci sono righe **`staff`** per quella `city_id` in Supabase, compaiono in tabella (allineamento base con Table Editor **`staff`**).
- [ ] **Ricerca** e **filtro stato** (`Tutti` / Attivi / Non attivi): nessun errore in UI.

---

## F — Promozione → Staff + Archivio (~5 min)

Scegli un **candidato di test** (non critico per produzione se possibile).

- [ ] Context menu sulla card → **Promuovi a Cameriere** (non deve essere dalla colonna Scartati).
- [ ] **Successo:** in Supabase **`staff`** compare (o aggiorna) una riga con **`source_candidate_id`** = id del candidato.
- [ ] Sul board, lo stesso candidato finisce nella colonna **Archivio** (stesso comportamento dell’«Archivia» manuale).
- [ ] **Reload F5 sulla board**: il candidato resta in **Archivio** (`pipeline_stage` coerente in Table Editor **`candidates`**).
- [ ] Ripeti **Promuovi** sullo **stesso** candidato dopo averlo eventualmente estratto dall’archivio (solo se vuoi stress test): comportamento **idempotente** su `staff` (nessuna riga duplicata per stesso `source_candidate_id`).
- [ ] Console browser: non deve rimanere un errore rosso **`Promozione cameriere su staff fallita`** senza che tu abbia un motivo atteso (rete, RLS, FK).

---

## G — Comandi da terminale (regressioni build)

Dalla root del monorepo:

```bash
pnpm build:admin
pnpm test:board
```

- [ ] `build:admin`: **exit code 0** (TypeScript + Vite produce `admin/dist`).
- [ ] `test:board`: **exit code 0**.

---

## Cosa registrare se qualcosa fallisce

- Slug sede coinvolta, slug pagina (**Candidati** vs **Camerieri**).
- Timestamp e messaggio errore UI o **console** (`Promozione cameriere…`, `CandidatesBoard UPDATE failed`, ecc.).
- In Supabase: snapshot o id di **`candidates.id`** / **`staff.id`** coinvolti; verifica **RLS** e presenza **`city_id`** valido nella riga **`staff`**.
- Migrazione legacy camerieri: chiave **`admin:camerieri:v1-local-drained-at`** e presenza/residuo **`admin:camerieri:crm:v1`** (solo se tema import locale).

---

## Riferimenti

- Implementazione CRM staff: [`PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md`](PROMPT_CHAT_E4_STAFF_CAMERIERI_SUPABASE.md)
- Note dev: [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) (§ Camerieri, § Board)
- Roadmap gate: [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md)
