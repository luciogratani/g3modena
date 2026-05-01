export type ContactMessageStatus = "nuovo" | "letto" | "archiviato"
export type ContactMessageSource = "web_contact_form" | "admin_manual" | "import"

export type ContactMessage = {
  id: string
  fullName: string
  company: string
  email: string
  phone: string
  city: string
  message: string
  status: ContactMessageStatus
  createdAt: string
  source: ContactMessageSource
}
