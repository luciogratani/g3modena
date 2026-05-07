# Prompt Chat - L3 Static-first (go-live)

Contesto: monorepo `g3modena` (`web`, `admin`, `supabase`).

Decisione gia approvata: **L3 = A (Static-first)**.

Obiettivo: completare il gate L3 per il primo go-live senza introdurre runtime CMS da DB nel sito pubblico.

---

## Vincoli

- Non cambiare la decisione prodotto: per il primo rilascio il sito pubblico resta alimentato da contenuti consolidati in build.
- Non introdurre fetch runtime verso `cms_sections` nel path principale di produzione.
- Non rimuovere adapter/fallback esistenti: possono restare come base tecnica per fase futura.
- Limitare le modifiche al necessario per chiudere L3 in modo verificabile.

---

## Task operative

1. Verificare che il runtime `web` in produzione usi contenuti statici consolidati (nessuna dipendenza hard da DB CMS per il rendering principale).
2. Aggiungere/aggiornare una checklist release per il flusso static-first:
   - dove aggiornare i contenuti,
   - come fare build/deploy,
   - cosa smoke-testare dopo deploy.
3. Esplicitare nei doc che `CMS wiring production-safe` e `Web runtime da DB` restano backlog post go-live.
4. Aggiornare i riferimenti incrociati tra:
   - `docs/IMPLEMENTATION_ROADMAP.md`
   - `docs/DEVELOPMENT_NOTES.md`
   - `docs/DB_CMS_INTEGRATION.md` (solo se serve chiarire il perimetro go-live)
5. Eseguire verifica minima:
   - `pnpm build:web`
   - smoke rapido home + careers form + contact form in locale o preview.

---

## Output atteso

1. Elenco file aggiornati.
2. Diff sintetico per ogni file (perche e cosa cambia).
3. Esito comandi (`build:web` e smoke minimo).
4. Stato finale L3:
   - chiuso del tutto, oppure
   - chiuso come "L3 decision + runbook static-first" con eventuali micro-attivita residue.

---

## Nota per la chat operativa

Se trovi incongruenze tra doc e codice, privilegia il codice per il dettaglio tecnico e aggiorna i doc in modo conservativo (senza ampliare scope).
