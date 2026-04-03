import { CONTACT_MESSAGES_MOCK } from "./mock-data"
import type { ContactMessage, ContactMessageStatus } from "./types"

const CONTACT_MESSAGES_STORAGE_KEY = "admin:contact-messages:v1"
export const CONTACT_MESSAGES_UPDATED_EVENT = "admin:contacts:messages-updated"

function sortByDateDesc(messages: ContactMessage[]): ContactMessage[] {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    return bTime - aTime
  })
}

function isContactMessage(value: unknown): value is ContactMessage {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<ContactMessage>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.fullName === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.phone === "string" &&
    typeof candidate.message === "string" &&
    (candidate.status === "nuovo" || candidate.status === "letto" || candidate.status === "archiviato") &&
    typeof candidate.createdAt === "string"
  )
}

function dispatchMessagesUpdatedEvent() {
  window.dispatchEvent(new CustomEvent(CONTACT_MESSAGES_UPDATED_EVENT))
}

export function loadContactMessages(): ContactMessage[] {
  const raw = localStorage.getItem(CONTACT_MESSAGES_STORAGE_KEY)
  if (!raw) {
    const seeded = sortByDateDesc(CONTACT_MESSAGES_MOCK)
    localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error("Invalid payload")
    const messages = parsed.filter(isContactMessage)
    if (messages.length === 0) {
      const seeded = sortByDateDesc(CONTACT_MESSAGES_MOCK)
      localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    return sortByDateDesc(messages)
  } catch {
    const seeded = sortByDateDesc(CONTACT_MESSAGES_MOCK)
    localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

export function saveContactMessages(messages: ContactMessage[]) {
  const sorted = sortByDateDesc(messages)
  localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(sorted))
  dispatchMessagesUpdatedEvent()
}

export function updateContactMessageStatus(messageId: string, status: ContactMessageStatus): ContactMessage[] {
  const current = loadContactMessages()
  const next = current.map((message) => (message.id === messageId ? { ...message, status } : message))
  saveContactMessages(next)
  return next
}

export function getNewContactMessagesCount(): number {
  return loadContactMessages().filter((message) => message.status === "nuovo").length
}
