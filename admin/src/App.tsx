import { Suspense, lazy, useEffect, useState } from "react"
import {
  Settings,
  FileEdit,
  ChevronDown,
  Search,
  MessageSquare,
  LayoutDashboard,
  Megaphone,
  Users,
  HelpCircle,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PageLoadingFallback } from "./components/PageLoadingFallback"
import { GestionaleContatti } from "./components/GestionaleContatti"
import {
  CONTACT_MESSAGES_UPDATED_EVENT,
  getNewContactMessagesCount,
} from "./components/contact-messages/storage"
import { Dashboard } from "./components/Dashboard"
import { CandidatiBoard } from "./components/CandidatiBoard"
import { CamerieriPage } from "./components/camerieri/CamerieriPage"
import { CampagnePage } from "./components/campagne/CampagnePage"
import { SettingsPage } from "./components/SettingsPage"
import { SeoSettingsPage } from "./components/SeoSettingsPage"
import { CANDIDATES } from "./data/mockCandidates"
import { createInitialBoardState, localStorageBoardAdapter } from "@/src/components/candidati-board/board-utils"
import {
  applyResolvedThemeMode,
  getInitialThemePreference,
  THEME_PREFERENCE_STORAGE_KEY,
  resolveThemeMode,
  type ThemePreference,
} from "./lib/theme-preference"

type Page =
  | "dashboard"
  | "campaigns"
  | "cms"
  | "seo"
  | "modenaBoard"
  | "sassariBoard"
  | "modenaWaiters"
  | "sassariWaiters"
  | "contactForm"
  | "settings"

const PAGE_TITLES: Record<Page, string> = {
  dashboard: "Dashboard › Overview",
  campaigns: "Marketing › Campagne",
  cms: "CMS › Web Editor",
  seo: "CMS › SEO",
  modenaBoard: "Candidati › Modena › Board",
  sassariBoard: "Candidati › Sassari › Board",
  modenaWaiters: "Camerieri › Modena",
  sassariWaiters: "Camerieri › Sassari",
  contactForm: "Contatti › Messaggi",
  settings: "Config › Impostazioni",
}

const CmsWebEditor = lazy(() =>
  import("./components/CmsWebEditor").then((module) => ({ default: module.CmsWebEditor })),
)

function getNewCandidatesByCityCounts() {
  const state = localStorageBoardAdapter.load(CANDIDATES) ?? createInitialBoardState(CANDIDATES)
  let modena = 0
  let sassari = 0
  for (const candidateId of state.columns.nuovo) {
    const candidate = state.byId[candidateId]
    if (!candidate) continue
    if (candidate.candidateCity === "modena") modena += 1
    if (candidate.candidateCity === "sassari") sassari += 1
  }
  return { modena, sassari }
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard")
  const [themePreference, setThemePreference] = useState<ThemePreference>(getInitialThemePreference)
  const [newCandidatesByCity, setNewCandidatesByCity] = useState(getNewCandidatesByCityCounts)
  const [newContactMessagesCount, setNewContactMessagesCount] = useState(getNewContactMessagesCount)

  useEffect(() => {
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, themePreference)
    applyResolvedThemeMode(resolveThemeMode(themePreference))

    if (themePreference !== "auto") return
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => applyResolvedThemeMode(resolveThemeMode("auto"))
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [themePreference])

  useEffect(() => {
    function refreshCandidateCounts() {
      setNewCandidatesByCity(getNewCandidatesByCityCounts())
    }

    refreshCandidateCounts()
    window.addEventListener("admin:candidates:board-updated", refreshCandidateCounts)
    window.addEventListener("focus", refreshCandidateCounts)
    window.addEventListener("storage", refreshCandidateCounts)
    return () => {
      window.removeEventListener("admin:candidates:board-updated", refreshCandidateCounts)
      window.removeEventListener("focus", refreshCandidateCounts)
      window.removeEventListener("storage", refreshCandidateCounts)
    }
  }, [])

  useEffect(() => {
    function refreshContactMessagesCount() {
      setNewContactMessagesCount(getNewContactMessagesCount())
    }

    refreshContactMessagesCount()
    window.addEventListener(CONTACT_MESSAGES_UPDATED_EVENT, refreshContactMessagesCount)
    window.addEventListener("focus", refreshContactMessagesCount)
    window.addEventListener("storage", refreshContactMessagesCount)
    return () => {
      window.removeEventListener(CONTACT_MESSAGES_UPDATED_EVENT, refreshContactMessagesCount)
      window.removeEventListener("focus", refreshContactMessagesCount)
      window.removeEventListener("storage", refreshContactMessagesCount)
    }
  }, [])

  function renderPage() {
    switch (page) {
      case "dashboard":
        return <Dashboard />
      case "cms":
        return (
          <Suspense fallback={<PageLoadingFallback title="CMS › Web Editor" description="Caricamento editor contenuti in corso..." />}>
            <CmsWebEditor />
          </Suspense>
        )
      case "seo":
        return <SeoSettingsPage />
      case "modenaBoard":
        return <CandidatiBoard boardCity="modena" />
      case "sassariBoard":
        return <CandidatiBoard boardCity="sassari" />
      case "contactForm":
        return <GestionaleContatti />
      case "modenaWaiters":
        return <CamerieriPage city="modena" />
      case "sassariWaiters":
        return <CamerieriPage city="sassari" />
      case "campaigns":
        return <CampagnePage />
      case "settings":
        return (
          <SettingsPage
            themePreference={themePreference}
            onThemePreferenceChange={setThemePreference}
          />
        )
    }
  }

  return (
    <>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex h-14 items-center gap-3 px-2 text-sidebar-primary">
              <svg
                className="h-6 w-auto shrink-0"
                viewBox="0 0 265.7 353.89"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                aria-hidden
              >
                <g>
                  <path d="m157.65 194 23.04 37.9c-17.19 9.11-36.79 14.28-57.6 14.28C55.11 246.18 0 191.07 0 123.09S55.11 0 123.09 0c34.08 0 64.93 13.85 87.21 36.23l-31.33 31.2c-14.28-14.34-34.04-23.21-55.88-23.21-43.56 0-78.87 35.31-78.87 78.87s35.31 78.87 78.87 78.87c12.39 0 24.12-2.86 34.56-7.96" />
                  <path d="M244.36 101.87H139.3v42.23h59.83c-4.67 16.95-14.85 31.6-28.5 41.93l23.05 37.91c31.75-22.26 52.5-59.13 52.5-100.85 0-7.24-.62-14.33-1.82-21.22" />
                  <path d="M235.49 203.88A139.6 139.6 0 0 1 205 234.67c10.68 7.18 17.7 19.38 17.7 33.21 0 22.09-17.91 40-40 40s-40-17.91-40-40c0-2.68.27-5.29.77-7.82-6.65.99-13.46 1.5-20.38 1.5-7.83 0-15.5-.66-22.98-1.92-.27 2.71-.41 5.45-.41 8.23 0 45.77 37.23 83 83 83s83-37.23 83-83c0-25.73-11.77-48.77-30.21-64Z" />
                </g>
              </svg>
              <span className="truncate font-semibold text-sidebar-foreground">
                G3 Backoffice
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent className="">
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex cursor-pointer items-center justify-between gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span>Dashboard</span>
                    <ChevronDown className="shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "dashboard"}
                          tooltip="Panoramica admin"
                          onClick={() => setPage("dashboard")}
                        >
                          <LayoutDashboard />
                          <span>Overview</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex cursor-pointer items-center justify-between gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span>Marketing</span>
                    <ChevronDown className="shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "campaigns"}
                          tooltip="Campagne marketing e UTM"
                          onClick={() => setPage("campaigns")}
                        >
                          <Megaphone />
                          <span>Campagne</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex cursor-pointer items-center justify-between gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span>CMS</span>
                    <ChevronDown className="shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "cms"}
                          tooltip="Contenuti sezioni sito web"
                          onClick={() => setPage("cms")}
                        >
                          <FileEdit />
                          <span>Web Editor</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "seo"}
                          tooltip="Impostazioni SEO"
                          onClick={() => setPage("seo")}
                        >
                          <Search />
                          <span>SEO</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex cursor-pointer items-center justify-between gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span>Candidati</span>
                    <ChevronDown className="shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "modenaBoard"}
                          tooltip="Candidati Modena"
                          onClick={() => setPage("modenaBoard")}
                        >
                          <Users />
                          <span>Modena</span>
                          {newCandidatesByCity.modena > 0 && (
                            <span className="ml-auto rounded-md bg-sidebar-primary/15 px-1.5 py-0.5 text-xs font-medium text-sidebar-primary">
                              {newCandidatesByCity.modena}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "sassariBoard"}
                          tooltip="Candidati Sassari"
                          onClick={() => setPage("sassariBoard")}
                        >
                          <Users />
                          <span>Sassari</span>
                          {newCandidatesByCity.sassari > 0 && (
                            <span className="ml-auto rounded-md bg-sidebar-primary/15 px-1.5 py-0.5 text-xs font-medium text-sidebar-primary">
                              {newCandidatesByCity.sassari}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex cursor-pointer items-center justify-between gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span>Camerieri</span>
                    <ChevronDown className="shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "modenaWaiters"}
                          tooltip="Camerieri Modena"
                          onClick={() => setPage("modenaWaiters")}
                        >
                          <Users />
                          <span>Modena</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "sassariWaiters"}
                          tooltip="Camerieri Sassari"
                          onClick={() => setPage("sassariWaiters")}
                        >
                          <Users />
                          <span>Sassari</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex cursor-pointer items-center justify-between gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span>Contatti</span>
                    <ChevronDown className="shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "contactForm"}
                          tooltip="Messaggi dal form Contatti"
                          onClick={() => setPage("contactForm")}
                        >
                          <MessageSquare />
                          <span>Messaggi</span>
                          {newContactMessagesCount > 0 && (
                            <span className="ml-auto rounded-md bg-sidebar-primary/15 px-1.5 py-0.5 text-xs font-medium text-sidebar-primary">
                              {newContactMessagesCount}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex cursor-pointer items-center justify-between gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span>Config</span>
                    <ChevronDown className="shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={page === "settings"}
                          tooltip="Impostazioni"
                          onClick={() => setPage("settings")}
                        >
                          <Settings />
                          <span>Impostazioni</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="min-w-0 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger />
            <SidebarRail />
            <span className="text-sm font-medium text-muted-foreground">
              {PAGE_TITLES[page]}
            </span>
            <TooltipProvider>
              <div className="ml-auto flex items-center gap-1">
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Aiuto">
                          <HelpCircle className="size-5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Aiuto rapido</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-72 p-4" align="end">
                    <p className="font-medium text-foreground mb-2">Aiuto</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground shrink-0">Zoom:</span>
                        <span>⌘ + / ⌘ − (Mac) oppure Ctrl + / Ctrl − (Windows) per ingrandire o ridurre la pagina.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground shrink-0">Sidebar:</span>
                        <span>Usa l’icona in alto a sinistra per aprire o chiudere il menu laterale.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground shrink-0">Board:</span>
                        <span>
                          Nella colonna Nuovo, usa il tasto destro su un filtro per aprire le
                          impostazioni filtri.
                        </span>
                      </li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
            </TooltipProvider>
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto">
            {renderPage()}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
