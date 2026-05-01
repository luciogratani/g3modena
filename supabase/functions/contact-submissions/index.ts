// @ts-ignore Supabase Edge resolves remote Deno imports at deploy/runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RawPayload = Record<string, unknown>;
type SupabaseClientLike = ReturnType<typeof createClient<any, "public", any>>;
type DenoRuntime = {
  serve: (
    handler: (request: Request) => Response | Promise<Response>,
  ) => void;
  env: { get: (name: string) => string | undefined };
};

const denoRuntime = globalThis as typeof globalThis & { Deno: DenoRuntime };

interface NormalizedPayload {
  fullName: string;
  company: string | null;
  email: string;
  phone: string;
  city: string | null;
  message: string;
  sessionId: string | null;
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "bad_request",
  ) {
    super(message);
  }
}

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

    const contentType = (request.headers.get("content-type") ?? "")
      .toLowerCase();
    if (!contentType.includes("application/json")) {
      throw new HttpError(
        415,
        "Content-Type non supportato",
        "unsupported_content_type",
      );
    }

    const payload = normalizePayload(await request.json() as RawPayload);
    const supabase = createClient(
      mustGetEnv("SUPABASE_URL"),
      mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await insertContactMessage(supabase, payload);
    if (error) {
      throw new HttpError(
        500,
        "Impossibile salvare il messaggio",
        "contact_insert_failed",
      );
    }

    return jsonResponse(
      { ok: true, id: data.id },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError ? error.code : "internal_error";
    const message = error instanceof Error
      ? error.message
      : "Errore interno durante l'invio della richiesta";

    return jsonResponse(
      { ok: false, code, message },
      { status, headers: corsHeaders },
    );
  }
});

function normalizePayload(raw: RawPayload): NormalizedPayload {
  const fullName = requiredString(raw.fullName, "fullName", 1, 120);
  const email = requiredString(raw.email, "email", 3, 254).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpError(400, "Email non valida", "email_invalid");
  }

  const phone = requiredString(raw.phone, "phone", 4, 40);
  const digitsCount = phone.replace(/\D/g, "").length;
  if (digitsCount < 4 || digitsCount > 15) {
    throw new HttpError(400, "Telefono non valido", "phone_invalid");
  }

  return {
    fullName,
    company: nullableString(raw.company, 120),
    email,
    phone,
    city: nullableString(raw.city, 80),
    message: requiredString(raw.message, "message", 1, 5000),
    sessionId: nullableString(raw.sessionId, 120),
  };
}

async function insertContactMessage(
  supabase: SupabaseClientLike,
  payload: NormalizedPayload,
) {
  return await supabase
    .from("contact_messages")
    .insert({
      full_name: payload.fullName,
      company: payload.company,
      email: payload.email,
      phone: payload.phone,
      city: payload.city,
      message: payload.message,
      status: "nuovo",
      source: "web_contact_form",
      session_id: payload.sessionId,
    })
    .select("id")
    .single();
}

function requiredString(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  const normalized = stringValue(value).trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new HttpError(400, `Campo ${field} non valido`, `${field}_invalid`);
  }
  return normalized;
}

function nullableString(value: unknown, maxLength: number): string | null {
  const normalized = stringValue(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new HttpError(400, "Campo testo troppo lungo", "text_too_long");
  }
  return normalized;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
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
  return (denoRuntime.Deno.env.get("CONTACT_ALLOWED_ORIGINS") ?? "")
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
