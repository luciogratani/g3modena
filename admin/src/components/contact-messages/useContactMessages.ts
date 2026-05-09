import { useCallback, useEffect, useMemo, useState } from "react"
import type { ContactMessage, ContactMessageStatus } from "./types"
import { listContactMessages, updateContactMessageStatus } from "./contact-messages-repository"

export function useContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextMessages = await listContactMessages()
      setMessages(nextMessages)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Errore durante il caricamento messaggi.")
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

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

  const setStatus = useCallback(async (messageId: string, status: ContactMessageStatus) => {
    let previousMessages: ContactMessage[] = []
    setMessages((previous) => {
      previousMessages = previous
      return previous.map((message) => (message.id === messageId ? { ...message, status } : message))
    })
    setError(null)
    try {
      await updateContactMessageStatus(messageId, status)
    } catch (updateError) {
      setMessages(previousMessages)
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Errore durante l'aggiornamento dello stato messaggio.",
      )
    }
  }, [])

  return {
    messages,
    loading,
    error,
    refresh,
    selectedMessage,
    selectedMessageId,
    setSelectedMessageId,
    counters,
    setStatus,
  }
}
