export interface NavigationLink {
  label: string
  href: string
  showInFooter?: boolean
}

export const navigationLinks: NavigationLink[] = [
  { label: "Chi siamo", href: "#about" },
  { label: "Clienti", href: "#clients" },
  { label: "Perché G3", href: "#why-g3", showInFooter: false },
  { label: "Contatti", href: "#contact" },
  { label: "Lavora con noi", href: "#careers" },
]
