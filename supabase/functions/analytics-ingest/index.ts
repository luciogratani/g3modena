// @ts-ignore Supabase Edge resolves remote Deno imports at deploy/runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedEventTypes = new Set([
  "page_view",
  "cta_click",
  "careers_form_open",
  "careers_step_view",
  "careers_abandon",
  "careers_submit",
]);

const EVENT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni
const EVENT_MAX_FUTURE_MS = 10 * 60 * 1000; // +10 minuti

type SupabaseClientLike = ReturnType<typeof createClient<any, "public", any>>;
type DenoRuntime = {
  serve: (
    handler: (request: Request) => Response | Promise<Response>,
  ) => void;
  env: { get: (name: string) => string | undefined };
};

type AnalyticsIngestRequest = {
  events?: unknown;
};

type AnalyticsEventInsert = {
  client_event_id: string | null;
  occurred_at: string;
  session_id: string;
  event_type: string;
  funnel_attempt_id: string | null;
  form_step_index: number | null;
  form_field_key: string | null;
  cta_key: string | null;
  city_slug: string | null;
  cid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  campaign_id: string | null;
};

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "bad_request",
  ) {
    super(message);
  }
}

const denoRuntime = globalThis as typeof globalThis & { Deno: DenoRuntime };

denoRuntime.Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    assertAllowedOrigin(origin);

    if (request.method !== "POST") {
      throw new HttpError(405, "Metodo non consentito", "method_not_allowed");
    }

    const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("application/json")) {
      throw new HttpError(
        415,
        "Content-Type non supportato",
        "unsupported_content_type",
      );
    }

    const payload = await parseJsonBody(request);
    if (!Array.isArray(payload.events)) {
      throw new HttpError(400, "Campo events non valido", "events_invalid");
    }

    if (payload.events.length === 0) {
      return jsonResponse(
        { ok: true, accepted_event_ids: [], accepted_count: 0, rejected_count: 0 },
        { status: 200, headers: corsHeaders },
      );
    }

    const supabase = createClient(
      mustGetEnv("SUPABASE_URL"),
      mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const campaignCache = new Map<string, string | null>();
    const timelineUpdates = new Map<string, { min: string; max: string }>();
    const acceptedEventIds: string[] = [];
    let acceptedCount = 0;
    let rejectedCount = 0;

    for (const rawEvent of payload.events) {
      const normalized = normalizeEvent(rawEvent);
      if (!normalized) {
        rejectedCount += 1;
        continue;
      }

      try {
        const campaignId = await resolveCampaignId(supabase, normalized.cid, campaignCache);
        const row: AnalyticsEventInsert = {
          ...normalized,
          campaign_id: campaignId,
        };
        const { error } = await supabase.from("analytics_events").insert(row);

        if (error) {
          if (isClientEventDuplicate(error)) {
            acceptedCount += 1;
            if (normalized.client_event_id) acceptedEventIds.push(normalized.client_event_id);
            continue;
          }
          rejectedCount += 1;
          continue;
        }

        acceptedCount += 1;
        if (normalized.client_event_id) acceptedEventIds.push(normalized.client_event_id);

        // Solo eventi nuovi (non duplicati) e attribuiti aggiornano la timeline campagna.
        if (campaignId) {
          collectTimelineUpdate(timelineUpdates, campaignId, row.occurred_at);
        }
      } catch {
        rejectedCount += 1;
      }
    }

    await applyTimelineUpdates(supabase, timelineUpdates);

    return jsonResponse(
      {
        ok: true,
        accepted_event_ids: acceptedEventIds,
        accepted_count: acceptedCount,
        rejected_count: rejectedCount,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError ? error.code : "internal_error";
    const message = error instanceof Error
      ? error.message
      : "Errore interno durante ingest analytics";

    return jsonResponse(
      { ok: false, code, message },
      { status, headers: corsHeaders },
    );
  }
});

async function parseJsonBody(request: Request): Promise<AnalyticsIngestRequest> {
  try {
    return await request.json() as AnalyticsIngestRequest;
  } catch {
    throw new HttpError(400, "Payload JSON non valido", "invalid_json");
  }
}

function normalizeEvent(raw: unknown): Omit<AnalyticsEventInsert, "campaign_id"> | null {
  if (!raw || typeof raw !== "object") return null;
  const event = raw as Record<string, unknown>;

  const occurredAtIso = normalizeOccurredAt(event.occurred_at);
  const sessionId = normalizeString(event.session_id, 1, 128);
  const eventType = normalizeString(event.event_type, 1, 40);

  if (!occurredAtIso || !sessionId || !eventType || !allowedEventTypes.has(eventType)) {
    return null;
  }

  const formStepIndex = normalizeInteger(event.form_step_index, 0, 32);
  const ctaKey = normalizeNullableString(event.cta_key, 120);

  if (eventType === "cta_click" && !ctaKey) return null;
  if ((eventType === "careers_step_view" || eventType === "careers_abandon") && formStepIndex === null) {
    return null;
  }

  return {
    client_event_id: normalizeNullableString(event.client_event_id, 128),
    occurred_at: occurredAtIso,
    session_id: sessionId,
    event_type: eventType,
    funnel_attempt_id: normalizeNullableString(event.funnel_attempt_id, 128),
    form_step_index: formStepIndex,
    form_field_key: normalizeNullableString(event.form_field_key, 120),
    cta_key: ctaKey,
    city_slug: normalizeNullableString(event.city_slug, 120),
    cid: normalizeNullableString(event.cid, 120),
    utm_source: normalizeNullableString(event.utm_source, 255),
    utm_medium: normalizeNullableString(event.utm_medium, 255),
    utm_campaign: normalizeNullableString(event.utm_campaign, 255),
    utm_term: normalizeNullableString(event.utm_term, 255),
    utm_content: normalizeNullableString(event.utm_content, 255),
  };
}

function normalizeOccurredAt(value: unknown): string | null {
  const raw = normalizeString(value, 1, 64);
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return null;

  const now = Date.now();
  if (timestamp < now - EVENT_MAX_AGE_MS) return null;
  if (timestamp > now + EVENT_MAX_FUTURE_MS) return null;

  return new Date(timestamp).toISOString();
}

function normalizeString(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) return null;
  return normalized;
}

function normalizeNullableString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : null;
}

function normalizeInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const integer = Math.floor(value);
  if (integer < min || integer > max) return null;
  return integer;
}

async function resolveCampaignId(
  supabase: SupabaseClientLike,
  cid: string | null,
  cache: Map<string, string | null>,
): Promise<string | null> {
  if (!cid) return null;
  if (cache.has(cid)) return cache.get(cid) ?? null;

  const { data, error } = await supabase.rpc(
    "resolve_campaign_id_from_cid",
    { p_cid: cid },
  );
  if (error) {
    throw new HttpError(
      500,
      "Impossibile risolvere la campagna",
      "campaign_lookup_failed",
    );
  }

  const campaignId = typeof data === "string" ? data : null;
  cache.set(cid, campaignId);
  return campaignId;
}

function collectTimelineUpdate(
  updates: Map<string, { min: string; max: string }>,
  campaignId: string,
  occurredAtIso: string,
): void {
  const existing = updates.get(campaignId);
  if (!existing) {
    updates.set(campaignId, { min: occurredAtIso, max: occurredAtIso });
    return;
  }
  // ISO-8601 UTC strings normalizzate (Z) sono confrontabili lessicograficamente.
  if (occurredAtIso < existing.min) existing.min = occurredAtIso;
  if (occurredAtIso > existing.max) existing.max = occurredAtIso;
}

async function applyTimelineUpdates(
  supabase: SupabaseClientLike,
  updates: Map<string, { min: string; max: string }>,
): Promise<void> {
  if (updates.size === 0) return;
  // Update timeline e' best-effort: gli eventi sono gia' persistiti e ack-ed.
  // Eventuali errori vengono solo loggati per non far fallire il batch intero.
  await Promise.all(
    Array.from(updates, async ([campaignId, { min, max }]) => {
      const { error } = await supabase.rpc("apply_campaign_event_timeline", {
        p_campaign_id: campaignId,
        p_min_occurred_at: min,
        p_max_occurred_at: max,
      });
      if (error) {
        console.error("[analytics-ingest] timeline update failed", {
          campaignId,
          min,
          max,
          error,
        });
      }
    }),
  );
}

function isClientEventDuplicate(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const item = error as Record<string, unknown>;
  const code = typeof item.code === "string" ? item.code : "";
  const message = typeof item.message === "string" ? item.message.toLowerCase() : "";
  const details = typeof item.details === "string" ? item.details.toLowerCase() : "";
  return (
    code === "23505" &&
    (message.includes("analytics_events_client_event_id_uidx") ||
      details.includes("analytics_events_client_event_id_uidx") ||
      message.includes("client_event_id") ||
      details.includes("client_event_id"))
  );
}

function mustGetEnv(name: string): string {
  const value = denoRuntime.Deno.env.get(name);
  if (!value) {
    throw new HttpError(
      500,
      `Variabile server ${name} mancante`,
      "missing_env",
    );
  }
  return value;
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = parseAllowedOrigins();
  let allowOrigin = "*";
  if (allowedOrigins.length > 0) {
    allowOrigin = origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0];
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function assertAllowedOrigin(origin: string | null): void {
  const allowedOrigins = parseAllowedOrigins();
  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    throw new HttpError(403, "Origin non autorizzata", "origin_forbidden");
  }
}

function parseAllowedOrigins(): string[] {
  return (denoRuntime.Deno.env.get("ANALYTICS_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function jsonResponse(
  body: Record<string, unknown>,
  init: { status: number; headers: Record<string, string> },
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status,
    headers: {
      ...init.headers,
      "Content-Type": "application/json",
    },
  });
}
