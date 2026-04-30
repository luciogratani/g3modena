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

## Note server-side consigliate

- Endpoint idempotente su `client_event_id` (evita duplicati su retry).
- Validare payload in modo tollerante (scartare/normalizzare campi invalidi senza interrompere tutto il batch quando possibile).
- Salvare `occurred_at` come timestamp evento client; opzionalmente aggiungere `received_at` lato server.
- Per fase Supabase, mappare verso tabella `analytics_events` mantenendo il modello append-only.
