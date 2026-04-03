import { useMemo, useState } from "react"
import type { ContactMessage, ContactMessageStatus } from "./types"
import { loadContactMessages, updateContactMessageStatus } from "./storage"

export function useContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>(() => loadContactMessages())
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId) ?? null,
    [messages, selectedMessageId],
  )

  const counters = useMemo(() => {
    const total = messages.length
    const newCount = messages.filter((message) => message.status === "nuovo").length
    const readCount = messages.filter((message) => message.status === "letto").length
    const archivedCount = messages.filter((message) => message.status === "archiviato").length
    return { total, newCount, readCount, archivedCount }
  }, [messages])

  const setStatus = (messageId: string, status: ContactMessageStatus) => {
    setMessages((previous) =>
      previous.map((message) => (message.id === messageId ? { ...message, status } : message)),
    )
    updateContactMessageStatus(messageId, status)
  }

  return {
    messages,
    selectedMessage,
    selectedMessageId,
    setSelectedMessageId,
    counters,
    setStatus,
  }
}
