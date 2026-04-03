import * as React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  LayoutGrid,
  Type,
  Palette,
  MousePointer2,
  FormInput,
  Layout,
  MessageSquare,
  PanelTop,
  Navigation,
  Table2,
  Sparkles,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { ScrollArea } from "@/components/ui/scroll-area"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar"
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@/components/ui/toast"

const formSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  bio: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const chartData = [
  { name: "Gen", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 600 },
  { name: "Apr", value: 800 },
]

const chartConfig = {
  value: { label: "Valore", color: "hsl(var(--chart-1))" },
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {Icon && <Icon className="size-5" />}
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Showcase() {
  const [shadcnToastOpen, setShadcnToastOpen] = useState(false)
  const [shadcnToastMessage, setShadcnToastMessage] = useState("Notifica dal componente Toast (Radix).")
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", email: "", bio: "" },
  })

  const themeVars = [
    { name: "background", desc: "Sfondo principale" },
    { name: "foreground", desc: "Testo principale" },
    { name: "card", desc: "Card sfondo/testo" },
    { name: "primary", desc: "Primario" },
    { name: "secondary", desc: "Secondario" },
    { name: "muted", desc: "Testo/secondari attenuato" },
    { name: "accent", desc: "Accenti hover" },
    { name: "destructive", desc: "Azioni distruttive" },
    { name: "border", desc: "Bordi" },
    { name: "input", desc: "Campi input" },
    { name: "ring", desc: "Focus ring" },
    { name: "radius", desc: "Border radius" },
    { name: "sidebar-*", desc: "Sidebar (background, foreground, primary, accent, border, ring)" },
    { name: "chart-1 … chart-5", desc: "Colori grafici" },
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">shadcn/ui – Showcase Admin</h1>
        <p className="text-muted-foreground mt-1">Tutti i componenti, temi e font in uso.</p>
      </header>

      <Tabs defaultValue="themes" className="flex flex-col gap-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="themes" className="gap-1.5">
            <Palette /> Temi & Font
          </TabsTrigger>
          <TabsTrigger value="buttons" className="gap-1.5">
            <MousePointer2 /> Button & Badge
          </TabsTrigger>
          <TabsTrigger value="form" className="gap-1.5">
            <FormInput /> Form & Input
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-1.5">
            <Layout /> Layout
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5">
            <MessageSquare /> Feedback
          </TabsTrigger>
          <TabsTrigger value="overlay" className="gap-1.5">
            <PanelTop /> Overlay
          </TabsTrigger>
          <TabsTrigger value="navigation" className="gap-1.5">
            <Navigation /> Navigation
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Table2 /> Data
          </TabsTrigger>
          <TabsTrigger value="altri" className="gap-1.5">
            <Sparkles /> Altri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="flex flex-col gap-8">
          <Section title="Font" icon={Type}>
            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm text-muted-foreground mb-2">Font in uso (CSS variable + fallback):</p>
              <code className="block rounded bg-muted px-3 py-2 text-sm font-mono">
                --font-sans: &quot;Inter&quot;, system-ui, sans-serif
              </code>
              <p className="mt-4 text-2xl font-normal">Inter 400 – The quick brown fox</p>
              <p className="text-xl font-medium">Inter 500 – The quick brown fox</p>
              <p className="text-xl font-semibold">Inter 600 – The quick brown fox</p>
              <p className="text-xl font-bold">Inter 700 – The quick brown fox</p>
            </div>
          </Section>
          <Section title="Temi (variabili CSS)" icon={Palette}>
            <p className="text-sm text-muted-foreground mb-4">
              Variabili definite in <code className="rounded bg-muted px-1">globals.css</code> per <code className="rounded bg-muted px-1">:root</code> (light) e <code className="rounded bg-muted px-1">.dark</code> (dark). Valori in HSL senza <code>hsl()</code> (es. <code>0 0% 100%</code>).
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {themeVars.map((v) => (
                <div key={v.name} className="rounded-lg border bg-card p-3">
                  <code className="text-sm font-medium">{v.name}</code>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Colori di esempio (utility Tailwind):</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-primary px-3 py-1.5 text-primary-foreground text-sm">primary</span>
                <span className="rounded bg-secondary px-3 py-1.5 text-secondary-foreground text-sm">secondary</span>
                <span className="rounded bg-muted px-3 py-1.5 text-muted-foreground text-sm">muted</span>
                <span className="rounded bg-accent px-3 py-1.5 text-accent-foreground text-sm">accent</span>
                <span className="rounded bg-destructive px-3 py-1.5 text-destructive-foreground text-sm">destructive</span>
                <span className="rounded border border-border bg-background px-3 py-1.5 text-foreground text-sm">border</span>
              </div>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="buttons" className="flex flex-col gap-8">
          <Section title="Button (varianti e size)" icon={MousePointer2}>
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🔔</Button>
            </div>
          </Section>
          <Section title="Badge" icon={LayoutGrid}>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </Section>
          <Section title="Toggle & Toggle group" icon={MousePointer2}>
            <div className="flex flex-wrap gap-4">
              <Toggle>Toggle</Toggle>
              <ToggleGroup type="single">
                <ToggleGroupItem value="a">A</ToggleGroupItem>
                <ToggleGroupItem value="b">B</ToggleGroupItem>
                <ToggleGroupItem value="c">C</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="form" className="flex flex-col gap-8">
          <Section title="Input, Label, Textarea" icon={FormInput}>
            <div className="grid max-w-sm gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="demo-input">Label</Label>
                <Input id="demo-input" placeholder="Placeholder" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="demo-textarea">Textarea</Label>
                <Textarea id="demo-textarea" placeholder="Scrivi qui..." rows={3} />
              </div>
            </div>
          </Section>
          <Section title="Checkbox, Switch, Radio, Slider" icon={FormInput}>
            <div className="flex flex-wrap gap-8">
              <div className="flex items-center gap-2">
                <Checkbox id="c1" />
                <Label htmlFor="c1">Checkbox</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="s1" />
                <Label htmlFor="s1">Switch</Label>
              </div>
              <RadioGroup defaultValue="one">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="one" id="r1" />
                  <Label htmlFor="r1">One</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="two" id="r2" />
                  <Label htmlFor="r2">Two</Label>
                </div>
              </RadioGroup>
              <div className="flex w-48 flex-col gap-2">
                <Label>Slider</Label>
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>
            </div>
          </Section>
          <Section title="Select" icon={FormInput}>
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Opzione A</SelectItem>
                <SelectItem value="b">Opzione B</SelectItem>
                <SelectItem value="c">Opzione C</SelectItem>
              </SelectContent>
            </Select>
          </Section>
          <Section title="Form (react-hook-form + zod)" icon={FormInput}>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(() => {
                  setShadcnToastMessage("Form valido!")
                  setShadcnToastOpen(true)
                })}
                className="flex max-w-sm flex-col gap-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@esempio.it" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Bio..." {...field} />
                      </FormControl>
                      <FormDescription>Breve descrizione.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Invia</Button>
              </form>
            </Form>
          </Section>
        </TabsContent>

        <TabsContent value="layout" className="flex flex-col gap-8">
          <Section title="Card" icon={Layout}>
            <Card className="w-[350px]">
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Descrizione della card.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Contenuto della card.</p>
              </CardContent>
              <CardFooter>
                <Button size="sm">Azione</Button>
              </CardFooter>
            </Card>
          </Section>
          <Section title="Separator" icon={Layout}>
            <div>
              <p className="text-sm">Sopra</p>
              <Separator className="my-2" />
              <p className="text-sm">Sotto</p>
            </div>
          </Section>
          <Section title="Accordion" icon={Layout}>
            <Accordion type="single" collapsible className="w-full max-w-md">
              <AccordionItem value="1">
                <AccordionTrigger>Sezione 1</AccordionTrigger>
                <AccordionContent>Contenuto della sezione 1.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="2">
                <AccordionTrigger>Sezione 2</AccordionTrigger>
                <AccordionContent>Contenuto della sezione 2.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>
          <Section title="Collapsible" icon={Layout}>
            <Collapsible className="w-full max-w-md">
              <CollapsibleTrigger asChild>
                <Button variant="outline">Apri/chiudi</Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="pt-2 text-sm text-muted-foreground">Contenuto collassabile.</p>
              </CollapsibleContent>
            </Collapsible>
          </Section>
          <Section title="Tabs (questo stesso blocco)" icon={Layout}>
            <p className="text-sm text-muted-foreground">La navigazione in alto è implementata con Tabs + TabsList + TabsTrigger + TabsContent.</p>
          </Section>
          <Section title="Resizable panels" icon={Layout}>
            <ResizablePanelGroup direction="horizontal" className="max-w-md rounded-lg border">
              <ResizablePanel defaultSize={50}>
                <div className="flex h-24 items-center justify-center p-2">Panel 1</div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={50}>
                <div className="flex h-24 items-center justify-center p-2">Panel 2</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </Section>
        </TabsContent>

        <TabsContent value="feedback" className="flex flex-col gap-8">
          <Section title="Alert" icon={MessageSquare}>
            <div className="flex max-w-xl flex-col gap-4">
              <Alert>
                <AlertTitle>Alert titolo</AlertTitle>
                <AlertDescription>Descrizione dell&apos;alert (variante default).</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>Alert distruttivo.</AlertDescription>
              </Alert>
            </div>
          </Section>
          <Section title="Progress" icon={MessageSquare}>
            <div className="flex w-64 flex-col gap-2">
              <Progress value={33} />
              <Progress value={66} />
              <Progress value={100} />
            </div>
          </Section>
          <Section title="Skeleton" icon={MessageSquare}>
            <div className="flex w-64 flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Section>
          <Section title="Toast (shadcn)" icon={MessageSquare}>
            <div className="flex flex-wrap gap-2">
              <ToastProvider>
                <Button
                  onClick={() => {
                    setShadcnToastMessage("Notifica dal componente Toast (Radix).")
                    setShadcnToastOpen(true)
                  }}
                >
                  Lancia Toast
                </Button>
                <ToastViewport>
                  <Toast open={shadcnToastOpen} onOpenChange={setShadcnToastOpen}>
                    <ToastTitle>Toast shadcn</ToastTitle>
                    <ToastDescription>
                      {shadcnToastMessage}
                    </ToastDescription>
                    <ToastClose />
                  </Toast>
                </ToastViewport>
              </ToastProvider>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="overlay" className="flex flex-col gap-8">
          <Section title="Dialog" icon={PanelTop}>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Apri Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Titolo dialog</DialogTitle>
                  <DialogDescription>Descrizione del dialog.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Annulla</Button>
                  <Button>Conferma</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>
          <Section title="Alert Dialog" icon={PanelTop}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Elimina</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                  <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction>Continua</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Section>
          <Section title="Sheet" icon={PanelTop}>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Apri Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Sheet</SheetTitle>
                  <SheetDescription>Contenuto laterale.</SheetDescription>
                </SheetHeader>
                <p className="py-4 text-sm text-muted-foreground">Contenuto dello sheet.</p>
              </SheetContent>
            </Sheet>
          </Section>
          <Section title="Drawer" icon={PanelTop}>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline">Apri Drawer</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Drawer</DrawerTitle>
                  <DrawerDescription>Pannello dal basso (mobile-friendly).</DrawerDescription>
                </DrawerHeader>
                <p className="p-4 text-sm text-muted-foreground">Contenuto.</p>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline">Chiudi</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </Section>
        </TabsContent>

        <TabsContent value="navigation" className="flex flex-col gap-8">
          <Section title="Dropdown Menu" icon={Navigation}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Apri menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profilo</DropdownMenuItem>
                <DropdownMenuItem>Impostazioni</DropdownMenuItem>
                <DropdownMenuItem>Esci</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Section>
          <Section title="Breadcrumb" icon={Navigation}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Showcase</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Section>
          <Section title="Pagination" icon={Navigation}>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </Section>
          <Section title="Navigation Menu" icon={Navigation}>
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>Home</NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>Documentazione</NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>Contatti</NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </Section>
          <Section title="Menubar" icon={Navigation}>
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>Nuovo</MenubarItem>
                  <MenubarItem>Apri</MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>Modifica</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>Annulla</MenubarItem>
                  <MenubarItem>Ripeti</MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </Section>
        </TabsContent>

        <TabsContent value="data" className="flex flex-col gap-8">
          <Section title="Table" icon={Table2}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Ruolo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Mario Rossi</TableCell>
                  <TableCell>Attivo</TableCell>
                  <TableCell>Admin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Luigi Verdi</TableCell>
                  <TableCell>In attesa</TableCell>
                  <TableCell>Editor</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Section>
          <Section title="Calendar" icon={Table2}>
            <Calendar mode="single" className="rounded-md border" />
          </Section>
          <Section title="Chart (Recharts)" icon={Table2}>
            <ChartContainer config={chartConfig} className="h-[200px] w-full max-w-md">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </Section>
        </TabsContent>

        <TabsContent value="altri" className="flex flex-col gap-8">
          <Section title="Avatar" icon={Sparkles}>
            <div className="flex gap-4">
              <Avatar>
                <AvatarFallback>MR</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
            </div>
          </Section>
          <TooltipProvider>
            <Section title="Tooltip" icon={Sparkles}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover per tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Testo del tooltip</p>
                </TooltipContent>
              </Tooltip>
            </Section>
          </TooltipProvider>
          <Section title="Popover" icon={Sparkles}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Apri popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm">Contenuto del popover.</p>
              </PopoverContent>
            </Popover>
          </Section>
          <Section title="Hover Card" icon={Sparkles}>
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="link">@hover</Button>
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="text-sm">Contenuto mostrato al hover.</p>
              </HoverCardContent>
            </HoverCard>
          </Section>
          <Section title="Context Menu (tasto destro)" icon={Sparkles}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="flex h-24 w-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Tasto destro qui
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => {
                    setShadcnToastMessage("Copia!")
                    setShadcnToastOpen(true)
                  }}
                >
                  Copia
                </ContextMenuItem>
                <ContextMenuItem>Incolla</ContextMenuItem>
                <ContextMenuItem>Elimina</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </Section>
          <Section title="Command (combobox)" icon={Sparkles}>
            <Command className="rounded-lg border shadow-md max-w-md">
              <CommandInput placeholder="Cerca..." />
              <CommandList>
                <CommandEmpty>Nessun risultato.</CommandEmpty>
                <CommandGroup heading="Suggerimenti">
                  <CommandItem>Opzione 1</CommandItem>
                  <CommandItem>Opzione 2</CommandItem>
                  <CommandItem>Opzione 3</CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </Section>
          <Section title="Aspect Ratio" icon={Sparkles}>
            <AspectRatio ratio={16 / 9} className="max-w-md rounded-lg border bg-muted">
              <div className="flex h-full items-center justify-center text-muted-foreground">16:9</div>
            </AspectRatio>
          </Section>
          <Section title="Scroll Area" icon={Sparkles}>
            <ScrollArea className="h-24 w-48 rounded-md border p-2">
              <p className="text-sm">Riga 1</p>
              <p className="text-sm">Riga 2</p>
              <p className="text-sm">Riga 3</p>
              <p className="text-sm">Riga 4</p>
              <p className="text-sm">Riga 5</p>
              <p className="text-sm">Riga 6</p>
            </ScrollArea>
          </Section>
          <Section title="Input OTP" icon={Sparkles}>
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </Section>
          <Section title="Carousel" icon={Sparkles}>
            <Carousel className="max-w-md mx-auto">
              <CarouselContent>
                <CarouselItem>Slide 1</CarouselItem>
                <CarouselItem>Slide 2</CarouselItem>
                <CarouselItem>Slide 3</CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
