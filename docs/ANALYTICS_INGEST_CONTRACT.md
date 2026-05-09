# Analytics Ingest Contract (v1)

Contratto HTTP per l'endpoint usato da `web/lib/analytics-ingest.ts` (step C4, pre-Supabase).

Obiettivo: definire un payload stabile per rendere lo swap verso backend reale plug-and-play.

---

## Endpoint

- **Method:** `POST`
- **URL:** configurata lato web da `VITE_ANALYTICS_INGEST_URL`
- **Content-Type:** `application/json`

---

## Request body

```json
{
  "events": [
    {
      "client_event_id": "uuid-string",
      "occurred_at": "2026-05-01T00:00:00.000Z",
      "session_id": "uuid-string",
      "event_type": "cta_click",
      "funnel_attempt_id": "uuid-string",
      "form_step_index": 2,
      "form_field_key": "office_city_slug",
      "cta_key": "hero_primary_contact",
      "city_slug": "modena",
      "cid": "g3abc123",
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "primavera",
      "utm_term": "camerieri",
      "utm_content": "hero_a"
    }
  ]
}
```

### Regole campi

- `events` obbligatorio, array (puo essere vuoto).
- `client_event_id` fortemente raccomandato (usato per ack/rimozione sicura dal buffer).
- `occurred_at`, `session_id`, `event_type` obbligatori per evento valido.
- Altri campi opzionali/nullable, valorizzati in base al tipo evento.
- `event_type` v1: `page_view`, `cta_click`, `careers_form_open`, `careers_step_view`, `careers_abandon`, `careers_submit`.

---

## Response success (ack)

L'adapter considera `2xx` come successo HTTP; per dedup/rimozione puntuale usa questi segnali:

### Opzione A (preferita): ack esplicito per id

```json
{
  "accepted_event_ids": ["uuid-1", "uuid-2"]
}
```

### Opzione B: ack per conteggio

```json
{
  "accepted_count": 10
}
```

### Opzione C: nessun body / body non parseable

- Se la risposta e `200/204` ma senza JSON valido, il client tratta il batch inviato come accettato (fallback C4 corrente).

---

## Error handling

- `4xx/5xx` => nessuna rimozione dal buffer locale; retry automatico silenzioso.
- Nessun errore mostrato all'utente finale.
- In dev sono emessi log `[analytics/ingest]`.

---

## Server v1 (Supabase Edge Function)

Implementazione target: `supabase/functions/analytics-ingest/index.ts`.

### Input e validazione

- `POST` JSON con body `{ events: [...] }`.
- Se `events` manca/non e array: `400`.
- Per ogni evento:
  - richiesti: `occurred_at`, `session_id`, `event_type`;
  - opzionali: tutti gli altri campi del contratto v1;
  - normalizzazione tollerante: trim stringhe, limiti lunghezza, cast numeri, scarto solo del singolo evento invalido;
  - `event_type` consentiti: `page_view`, `cta_click`, `careers_form_open`, `careers_step_view`, `careers_abandon`, `careers_submit`.

### Persistenza e mapping campagna

- Insert append-only su `public.analytics_events`.
- `campaign_id` risolto server-side da `cid` con bridge `public.resolve_campaign_id_from_cid(text)`.
- Se il mapping non trova campagna valida, l'evento resta valido con `campaign_id = null`.

### Idempotenza e duplicati

- Duplicati su `client_event_id` non devono rompere il batch.
- Se un evento duplicato viene ricevuto, e considerato "accepted" ai fini ack (cosi il client puo svuotare il buffer in retry).

### Ack response

- Successo: `200` con:
  - `accepted_event_ids`: array di `client_event_id` effettivamente accettati (nuovi o duplicati),
  - `accepted_count`: totale eventi accettati.
- Errori payload globali (es. body non JSON, `events` non array): `4xx` con `ok: false`.
- Errori interni: `500` con `ok: false`.
