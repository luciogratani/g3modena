# Prompt Chat - Analytics ingest reale su Supabase (+ base KPI campagne)

Contesto: monorepo `g3modena` (`web`, `admin`, `supabase`).

Stato attuale verificato:

- il browser traccia eventi e li salva in buffer locale (`sessionStorage`);
- l'invio remoto parte solo se esiste `VITE_ANALYTICS_INGEST_URL`;
- nel repo non esiste ancora una Edge Function dedicata all'ingest analytics;
- KPI campagne in admin restano placeholder finche `analytics_events` non viene popolata in modo affidabile.

Obiettivo: attivare una pipeline reale di ingest eventi verso `public.analytics_events`, in modo sicuro e verificabile, senza allargare scope oltre il necessario.

---

## Decisioni operative (bloccate)

Queste decisioni sono gia prese per questa iterazione: non ridiscuterle durante l'esecuzione.

1. **Priorita assoluta:** chiudere il "rosso" KPI, quindi ingest reale + smoke E2E + update timeline campagne (`first_data_at`/`last_data_at`).
2. **KPI v1 minimo:** usare solo metrica base da `analytics_events` (`page_view`, `cta_click`, `careers_form_open`, `careers_submit`, `careers_abandon`) + fallback "in attesa dati".
3. **Fix funnel incluso ora:** `careers_form_open` va emesso su primo segnale reale di intent (non al mount del componente).
4. **Fuori scope ora (rimandato):** `registration_duration_seconds`, arricchimento payload (`page_path`, `referrer_host`, `device_class`) e altri eventi extra.
5. **Nessun dato fittizio:** vietato scrivere KPI denormalizzati/fake su `campaigns`.

---

## Modalita di esecuzione (obbligatoria)

Esegui **uno step per volta**. A fine step:

1. elenca file toccati,
2. mostra verifiche eseguite,
3. dichiara se lo step e chiuso o cosa manca.

Non anticipare step successivi senza conferma esplicita.

---

## Step 1 - Audit tecnico mirato (read-only)

Scopo: confermare i punti di integrazione gia presenti prima di cambiare codice.

Checklist:

1. Verificare bootstrap analytics nel web (`startAnalyticsIngestAdapter`).
2. Verificare formato payload client (`web/lib/analytics-ingest.ts`) vs `docs/ANALYTICS_INGEST_CONTRACT.md`.
3. Verificare schema/policy `analytics_events` nelle migrazioni Supabase.
4. Verificare se esiste gia endpoint ingest deployato (nel repo e in doc operative).

Done step:

- matrice "esiste / manca" chiara per: endpoint, env, mapping campagna, policy.

---

## Step 2 - Disegno endpoint ingest (contratto server v1)

Scopo: definire in modo stabile cosa deve fare la nuova funzione.

Checklist:

1. Definire endpoint (Edge Function) e metodo (`POST`).
2. Definire validazioni minime campo-per-campo (tolleranti, non fragili).
3. Definire idempotenza (`client_event_id`) e comportamento su duplicati.
4. Definire risposta di ack (`accepted_event_ids` preferita, fallback `accepted_count`).
5. Definire strategia mapping `cid -> campaign_id` usando bridge esistente.

Done step:

- mini-spec approvata (input, normalizzazione, output, error handling) senza ambiguita.

---

## Step 3 - Implementazione Edge Function ingest

Scopo: creare il receiver reale.

Checklist:

1. Creare nuova function (`supabase/functions/analytics-ingest/index.ts`).
2. Implementare parse JSON batch + validazione tollerante.
3. Per ogni evento valido:
   - normalizzare campi;
   - risolvere `campaign_id` da `cid` quando possibile;
   - fare insert append-only in `public.analytics_events`.
4. Gestire dedup tramite vincolo `client_event_id` (no crash batch intero).
5. Restituire ack coerente col contratto.

Done step:

- funzione compilata, deployabile, con smoke `curl` che restituisce `200` + ack.

---

## Step 4 - Wiring web env + invio reale

Scopo: collegare il client all'endpoint reale.

Checklist:

1. Aggiornare `web/.env.example` con valore/forma endpoint corretta per ingest.
2. Verificare che il web invii eventi all'endpoint quando env presente.
3. Confermare fallback sicuro a buffer locale quando env assente (no regressioni).
4. Verificare che il mock locale resti opzionale per dev.

Done step:

- con env attiva: richieste network presenti e buffer che si svuota su ack;
- senza env: comportamento attuale invariato (solo locale).

---

## Step 5 - Smoke end-to-end minimo

Scopo: dimostrare che i dati arrivano davvero in DB.

Checklist:

1. Aprire sito e generare almeno:
   - `page_view`,
   - un `cta_click`,
   - un evento `careers_*` (open/step/submit se possibile).
2. Verificare richieste HTTP ingest (`2xx`) dal browser.
3. Verificare in DB nuove righe su `public.analytics_events`.
4. Verificare valorizzazione `cid`/UTM e, dove applicabile, `campaign_id`.

Done step:

- prova ripetibile con evidenza browser + evidenza DB.

---

## Step 6 - Timeline campagne (`first_data_at` / `last_data_at`)

Scopo: sbloccare stato ciclo campagna reale (`No dati / Attiva / Disattiva`).

Checklist:

1. Definire unico punto canonico di update timeline (consigliato server-side ingest).
2. Implementare regole:
   - se `first_data_at` e null: impostarla al primo evento attribuito;
   - aggiornare sempre `last_data_at` su eventi attribuiti.
3. Garantire coerenza con vincoli DB (`last_data_at >= first_data_at`).

Done step:

- timeline campagne si aggiorna automaticamente senza azioni manuali in admin.

---

## Step 7 - Base KPI campagne (solo minimo utile)

Scopo: uscire da placeholder/zero nelle card con query sicure.

Checklist:

1. Implementare aggregati minimi per campagna:
   - `page_view`,
   - `cta_click`,
   - `careers_form_open`,
   - `careers_submit`,
   - `careers_abandon`.
2. Esporre in admin fallback "in attesa dati" quando campagna non ha eventi.
3. Evitare query pesanti lato client (preferire endpoint aggregato/RPC se necessario).
4. Applicare fix funnel: `careers_form_open` emesso su intent reale utente.

Done step:

- card campagne mostrano KPI reali su dataset presente.

---

## Step 8 - Documentazione e chiusura

Aggiornare documenti:

- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/DEVELOPMENT_NOTES.md`
- `docs/ANALYTICS_INGEST_CONTRACT.md` (se il contratto e stato raffinato)
- eventuale prompt campagne (stato Step 6).

Output finale:

1. file toccati,
2. verifiche eseguite,
3. rischi residui,
4. prossimi step consigliati.

---

## Allineamento dashboard admin (decisioni UX/KPI)

Queste indicazioni guidano la pulizia dashboard mentre si chiudono gli step analytics:

1. Rimuovere la voce/card **"Contenuti CMS"** (non prioritaria per KPI operativi attuali).
2. **"Fonte traffico"** resta utile ma va mostrata solo con fallback robusto (`direct/unknown`) o temporaneamente nascosta se attribution non affidabile.
3. Sostituire **"Messaggi e candidature per mese"** con **"Candidature per mese"** (focus recruiting).
4. Rendere **"Pipeline candidature per città"** dinamica sulle città reali (`cities`), evitando assunzioni hardcoded su Modena/Sassari.
5. Mantenere **"Traffico ultimi 3 mesi"**.

Nota operativa: in ambiente dev i `page_view` possono apparire duplicati per effetto di React StrictMode; non usarli come riferimento assoluto per valutare qualità KPI.

### Stato implementazione (chiusura punto 2 dei "Prossimi step")

- card stats: `Messaggi nuovi` (count `contact_messages.status='nuovo'`), `Candidature totali` (count `candidates`), `Eventi ingest 30gg` (count `analytics_events.occurred_at >= now()-30d`); rimossa "Contenuti CMS".
- "Candidature per mese": bar chart su `candidates.created_at` ultimi 6 mesi (label IT abbreviati, asse Y senza decimali).
- "Fonte traffico (candidature)": pie chart su `candidates.utm_source` con bucket `Diretto/Sconosciuto` per valori NULL/empty (no feature flag, sempre visibile, palette dinamica).
- "Pipeline candidature per città": stacked bar dinamico, join `cities` + `candidates`, mostra solo città con ≥1 candidato; stage attivi `nuovo/colloquio/formazione` + bucket `altro` per `in_attesa/rimandati/archivio/scartati`.
- "Traffico ultimi 3 mesi": area chart reale su `analytics_events` (`page_view/cta_click/careers_submit`) raggruppato per mese.
- empty state condiviso con `ChartEmpty` quando il dataset e vuoto; loading con `Skeleton`; errore non bloccante in `Alert` destructive.
- repository: `admin/src/components/dashboard/dashboard-repository.ts` espone `loadDashboardData()` con `Promise.all` su tre blocchi (stats, candidates aggregates, traffic).

---

## Vincoli

- Niente seed business nelle migrazioni.
- Niente workaround lato admin che scrivono KPI finti su `campaigns`.
- Non introdurre dipendenze non necessarie se la pipeline e gia coperta da stack attuale.
- Mantenere compatibilita col contratto eventi v1 e con L3 static-first.
- Non includere in questa iterazione nuovi campi evento o KPI avanzati non richiesti dai punti sopra.
