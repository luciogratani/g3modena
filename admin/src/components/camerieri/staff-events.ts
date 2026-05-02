/**
 * Evento per invalidare liste UI dopo scritture su `public.staff`.
 * Evita cicli tra repository e azioni CRM (promozione board).
 */
export const STAFF_LIST_INVALIDATION_EVENT = "admin:camerieri-staff:list-invalidate"

export function dispatchStaffListInvalidated(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(STAFF_LIST_INVALIDATION_EVENT))
}
