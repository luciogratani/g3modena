// @ts-ignore Supabase Edge resolves remote Deno imports at deploy/runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PHOTO_BUCKET = "careers-photos";
const CV_BUCKET = "careers-cv";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_CV_BYTES = 10 * 1024 * 1024;

const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedEducationLevels = new Set([
  "Liceo",
  "Diploma tecnico/professionale",
  "Laurea triennale",
  "Laurea magistrale",
  "Master",
  "Altro",
]);
const allowedLanguages = new Set([
  "Italiano",
  "Inglese",
  "Francese",
  "Spagnolo",
  "Tedesco",
  "Altro",
]);

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
  officeCitySlug: string;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  residenceCity: string;
  availability: string;
  educationLevel: string;
  isAwayStudent: boolean;
  languages: string[];
  hasDriverLicense: boolean;
  plansNextTwoYears: string | null;
  jobAttraction: string;
  hasRelevantExperience: boolean;
  privacyConsentAccepted: true;
  cid: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

interface ParsedRequest {
  payload: NormalizedPayload;
  profilePhoto: AttachmentInput | null;
  cv: AttachmentInput | null;
}

interface AttachmentInput {
  filename: string;
  contentType: string;
  size: number;
  blob: Blob;
}

interface UploadRecord {
  bucket: string;
  path: string;
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

    const supabaseUrl = mustGetEnv("SUPABASE_URL");
    const serviceRoleKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { payload, profilePhoto, cv } = await parseRequest(request);
    const candidateId = crypto.randomUUID();

    const city = await resolveActiveCityId(supabase, payload.officeCitySlug);
    const campaignId = await resolveCampaignId(supabase, payload.cid);
    const uploaded: UploadRecord[] = [];

    try {
      const profilePhotoPath = profilePhoto
        ? await uploadAttachment(supabase, {
          bucket: PHOTO_BUCKET,
          candidateId,
          attachment: profilePhoto,
          kind: "profile-photo",
        }, uploaded)
        : null;

      if (!profilePhotoPath) {
        throw new HttpError(
          400,
          "Foto profilo obbligatoria",
          "profile_photo_required",
        );
      }

      const cvPath = cv
        ? await uploadAttachment(supabase, {
          bucket: CV_BUCKET,
          candidateId,
          attachment: cv,
          kind: "cv",
        }, uploaded)
        : null;

      const kanbanRank = await nextKanbanRankForNewColumn(supabase, city.id);

      const { error: insertError } = await supabase.from("candidates").insert({
        id: candidateId,
        city_id: city.id,
        campaign_id: campaignId,
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        age: payload.age,
        residence_city: payload.residenceCity,
        availability: payload.availability,
        education_level: payload.educationLevel,
        is_away_student: payload.isAwayStudent,
        languages: payload.languages,
        has_driver_license: payload.hasDriverLicense,
        has_relevant_experience: payload.hasRelevantExperience,
        plans_next_two_years: payload.plansNextTwoYears,
        job_attraction: payload.jobAttraction,
        profile_photo_path: profilePhotoPath,
        cv_path: cvPath,
        privacy_consent_accepted: true,
        pipeline_stage: "nuovo",
        discard_reason_key: null,
        discard_reason_note: null,
        discarded_at: null,
        discard_return_status: null,
        utm_source: payload.utmSource,
        utm_medium: payload.utmMedium,
        utm_campaign: payload.utmCampaign,
        utm_term: payload.utmTerm,
        utm_content: payload.utmContent,
        registration_duration_seconds: null,
        kanban_rank: kanbanRank,
        admin_workflow: {},
      });

      if (insertError) {
        throw new HttpError(
          500,
          "Impossibile salvare la candidatura",
          "candidate_insert_failed",
        );
      }
    } catch (error) {
      await cleanupUploadedObjects(supabase, uploaded);
      throw error;
    }

    return jsonResponse(
      { ok: true, candidateId },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError ? error.code : "internal_error";
    const message = error instanceof Error
      ? error.message
      : "Errore interno durante l'invio della candidatura";

    return jsonResponse(
      { ok: false, code, message },
      { status, headers: corsHeaders },
    );
  }
});

async function parseRequest(request: Request): Promise<ParsedRequest> {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("application/json")) {
    const payload = await request.json() as RawPayload;
    return {
      payload: normalizePayload(payload),
      profilePhoto: parseDataUrlAttachment(
        stringValue(payload.profilePhotoDataUrl),
        stringValue(payload.profilePhotoFileName) || "profile-photo",
        allowedPhotoTypes,
        MAX_PHOTO_BYTES,
        "profile_photo_invalid",
      ),
      cv: parseDataUrlAttachment(
        stringValue(payload.cvPreviewUrl),
        stringValue(payload.cvFileName) || "cv.pdf",
        new Set(["application/pdf"]),
        MAX_CV_BYTES,
        "cv_invalid",
      ),
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payload = Object.fromEntries(formData.entries());
    return {
      payload: normalizePayload(payload),
      profilePhoto: parseFileAttachment(
        formData.get("profilePhoto"),
        allowedPhotoTypes,
        MAX_PHOTO_BYTES,
        "profile_photo_invalid",
      ),
      cv: parseFileAttachment(
        formData.get("cv"),
        new Set(["application/pdf"]),
        MAX_CV_BYTES,
        "cv_invalid",
      ),
    };
  }

  throw new HttpError(
    415,
    "Content-Type non supportato",
    "unsupported_content_type",
  );
}

function normalizePayload(raw: RawPayload): NormalizedPayload {
  const fullName = requiredString(raw.fullName, "fullName", 2, 100);
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(fullName)) {
    throw new HttpError(400, "Nome non valido", "full_name_invalid");
  }

  const email = requiredString(raw.email, "email", 3, 254).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpError(400, "Email non valida", "email_invalid");
  }

  const phone = requiredString(raw.phone, "phone", 4, 40);
  const digitsCount = phone.replace(/\D/g, "").length;
  if (digitsCount < 8 || digitsCount > 15) {
    throw new HttpError(400, "Telefono non valido", "phone_invalid");
  }

  const ageRaw = requiredString(raw.age, "age", 1, 3);
  const age = Number.parseInt(ageRaw, 10);
  if (!/^\d{2}$/.test(ageRaw) || Number.isNaN(age) || age < 18 || age > 99) {
    throw new HttpError(400, "Età non valida", "age_invalid");
  }

  const officeCitySlug = requiredString(
    raw.officeCitySlug,
    "officeCitySlug",
    1,
    64,
  );
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(officeCitySlug)) {
    throw new HttpError(
      400,
      "Sede candidatura non valida",
      "office_city_invalid",
    );
  }

  const educationLevel = requiredString(
    raw.educationLevel,
    "educationLevel",
    1,
    120,
  );
  if (!allowedEducationLevels.has(educationLevel)) {
    throw new HttpError(
      400,
      "Titolo di studio non valido",
      "education_invalid",
    );
  }

  const languages = parseLanguages(raw.languages);
  if (
    languages.length === 0 ||
    languages.length > 16 ||
    languages.some((language) => !allowedLanguages.has(language))
  ) {
    throw new HttpError(400, "Lingue non valide", "languages_invalid");
  }

  const privacyConsentAccepted = booleanValue(raw.privacyConsentAccepted);
  if (privacyConsentAccepted !== true) {
    throw new HttpError(
      400,
      "Consenso privacy obbligatorio",
      "privacy_consent_required",
    );
  }

  return {
    officeCitySlug,
    fullName,
    email,
    phone,
    age,
    residenceCity: requiredString(raw.city, "city", 2, 80),
    availability: requiredString(raw.availability, "availability", 1, 120),
    educationLevel,
    isAwayStudent: yesNoBoolean(raw.isAwayStudent, "isAwayStudent"),
    languages,
    hasDriverLicense: yesNoBoolean(raw.hasDriverLicense, "hasDriverLicense"),
    plansNextTwoYears: nullableString(raw.plansNextTwoYears, 2000),
    jobAttraction: requiredString(raw.jobAttraction, "jobAttraction", 1, 2000),
    hasRelevantExperience: yesNoBoolean(
      raw.hasRelevantExperience,
      "hasRelevantExperience",
    ),
    privacyConsentAccepted: true,
    cid: nullableString(raw.cid, 64),
    utmSource: nullableString(raw.utmSource, 255),
    utmMedium: nullableString(raw.utmMedium, 255),
    utmCampaign: nullableString(raw.utmCampaign, 255),
    utmTerm: nullableString(raw.utmTerm, 255),
    utmContent: nullableString(raw.utmContent, 255),
  };
}

function requiredString(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  const normalized = stringValue(value).trim();
  if (
    normalized.length < minLength ||
    normalized.length > maxLength
  ) {
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

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
}

function yesNoBoolean(value: unknown, field: string): boolean {
  if (value === "yes") return true;
  if (value === "no") return false;
  throw new HttpError(400, `Campo ${field} non valido`, `${field}_invalid`);
}

function parseLanguages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string =>
          typeof item === "string"
        );
      }
    } catch {
      return [];
    }
  }

  return [];
}

function parseFileAttachment(
  value: FormDataEntryValue | null,
  allowedTypes: Set<string>,
  maxBytes: number,
  errorCode: string,
): AttachmentInput | null {
  if (!(value instanceof File) || value.size === 0) return null;

  validateAttachment(value.type, value.size, allowedTypes, maxBytes, errorCode);
  return {
    filename: value.name,
    contentType: value.type,
    size: value.size,
    blob: value,
  };
}

function parseDataUrlAttachment(
  dataUrl: string,
  filename: string,
  allowedTypes: Set<string>,
  maxBytes: number,
  errorCode: string,
): AttachmentInput | null {
  if (!dataUrl) return null;

  const match = dataUrl.match(/^data:([^;,]+);base64,(.*)$/);
  if (!match) {
    throw new HttpError(400, "Data URL allegato non valido", errorCode);
  }

  const contentType = match[1];
  let binary = "";
  try {
    binary = atob(match[2]);
  } catch {
    throw new HttpError(400, "Data URL allegato non valido", errorCode);
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  validateAttachment(
    contentType,
    bytes.byteLength,
    allowedTypes,
    maxBytes,
    errorCode,
  );
  return {
    filename,
    contentType,
    size: bytes.byteLength,
    blob: new Blob([bytes], { type: contentType }),
  };
}

function validateAttachment(
  contentType: string,
  size: number,
  allowedTypes: Set<string>,
  maxBytes: number,
  errorCode: string,
): void {
  if (!allowedTypes.has(contentType) || size > maxBytes) {
    throw new HttpError(400, "Allegato non valido", errorCode);
  }
}

async function resolveActiveCityId(
  supabase: SupabaseClientLike,
  slug: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new HttpError(
      500,
      "Impossibile verificare la sede",
      "city_lookup_failed",
    );
  }

  if (!data?.id) {
    throw new HttpError(400, "Sede candidatura non attiva", "city_not_active");
  }

  return { id: data.id };
}

async function nextKanbanRankForNewColumn(
  supabase: SupabaseClientLike,
  cityId: string,
): Promise<number> {
  // Append in coda alla colonna `nuovo` per quella sede: max(rank) + 1000.
  // Coerente con la strategia midpoint float della board admin (E4/L5).
  const { data, error } = await supabase
    .from("candidates")
    .select("kanban_rank")
    .eq("city_id", cityId)
    .eq("pipeline_stage", "nuovo")
    .order("kanban_rank", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HttpError(
      500,
      "Impossibile calcolare la posizione kanban",
      "kanban_rank_lookup_failed",
    );
  }

  const currentMax = typeof data?.kanban_rank === "number"
    ? data.kanban_rank
    : Number(data?.kanban_rank ?? 0);
  return (Number.isFinite(currentMax) ? currentMax : 0) + 1000;
}

async function resolveCampaignId(
  supabase: SupabaseClientLike,
  cid: string | null,
): Promise<string | null> {
  if (!cid) return null;

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

  return typeof data === "string" ? data : null;
}

async function uploadAttachment(
  supabase: SupabaseClientLike,
  options: {
    bucket: string;
    candidateId: string;
    attachment: AttachmentInput;
    kind: "profile-photo" | "cv";
  },
  uploaded: UploadRecord[],
): Promise<string> {
  const path = `${options.candidateId}/${options.kind}.${
    extensionForMime(options.attachment.contentType)
  }`;
  const { error } = await supabase.storage
    .from(options.bucket)
    .upload(path, options.attachment.blob, {
      contentType: options.attachment.contentType,
      upsert: false,
    });

  if (error) {
    throw new HttpError(500, "Impossibile salvare l'allegato", "upload_failed");
  }

  uploaded.push({ bucket: options.bucket, path });
  return path;
}

function extensionForMime(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "application/pdf") return "pdf";
  return "bin";
}

async function cleanupUploadedObjects(
  supabase: SupabaseClientLike,
  uploaded: UploadRecord[],
): Promise<void> {
  const byBucket = new Map<string, string[]>();
  for (const item of uploaded) {
    byBucket.set(item.bucket, [
      ...(byBucket.get(item.bucket) ?? []),
      item.path,
    ]);
  }

  await Promise.all(
    [...byBucket.entries()].map(([bucket, paths]) =>
      supabase.storage.from(bucket).remove(paths)
    ),
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
  return (denoRuntime.Deno.env.get("CAREERS_ALLOWED_ORIGINS") ?? "")
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
