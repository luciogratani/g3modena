import type { PostgrestError } from "@supabase/supabase-js"
import { hasSupabaseConfig, supabase } from "../../lib/supabase"
import type { ContactMessage, ContactMessageSource, ContactMessageStatus } from "./types"

export const CONTACT_MESSAGES_UPDATED_EVENT = "admin:contacts:messages-updated"

type ContactMessageRow = {
  id: string
  full_name: string
  company: string | null
  email: string
  phone: string | null
  city: string | null
  message: string
  status: ContactMessageStatus
  source: ContactMessageSource
  created_at: string
}

const CONTACT_MESSAGE_COLUMNS = [
  "id",
  "full_name",
  "company",
  "email",
  "phone",
  "city",
  "message",
  "status",
  "source",
  "created_at",
].join(", ")

function getSupabaseClient() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error(
      "Supabase admin non configurato. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    )
  }
  return supabase
}

function toContactMessagesError(error: PostgrestError, fallback: string): Error {
  if (error.code === "23514") {
    return new Error("Aggiornamento messaggio rifiutato: vincolo DB non rispettato.")
  }
  return new Error(error.message || fallback)
}

function rowToContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    fullName: row.full_name,
    company: row.company ?? "",
    email: row.email,
    phone: row.phone ?? "",
    city: row.city ?? "",
    message: row.message,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
  }
}

function dispatchMessagesUpdatedEvent() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CONTACT_MESSAGES_UPDATED_EVENT))
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("contact_messages")
    .select(CONTACT_MESSAGE_COLUMNS)
    .order("created_at", { ascending: false })

  if (error) throw toContactMessagesError(error, "Impossibile caricare i messaggi contatti.")
  return ((data ?? []) as unknown as ContactMessageRow[]).map(rowToContactMessage)
}

export async function updateContactMessageStatus(
  messageId: string,
  status: ContactMessageStatus,
): Promise<void> {
  const client = getSupabaseClient()
  const { error } = await client
    .from("contact_messages")
    .update({ status })
    .eq("id", messageId)
    .select("id")
    .single()

  if (error) throw toContactMessagesError(error, "Impossibile aggiornare lo stato del messaggio.")
  dispatchMessagesUpdatedEvent()
}

export async function countNewContactMessages(): Promise<number> {
  const client = getSupabaseClient()
  const { count, error } = await client
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "nuovo")

  if (error) throw toContactMessagesError(error, "Impossibile contare i messaggi nuovi.")
  return count ?? 0
}
