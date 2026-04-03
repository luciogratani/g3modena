import { useId } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { MessageSquare, Briefcase, FileEdit } from "lucide-react"

const chartSubmissions = [
  { name: "Gen", messaggi: 4, candidature: 8 },
  { name: "Feb", messaggi: 6, candidature: 12 },
  { name: "Mar", messaggi: 3, candidature: 7 },
  { name: "Apr", messaggi: 8, candidature: 15 },
  { name: "Mag", messaggi: 5, candidature: 9 },
]

const chartSource = [
  { name: "Sito web", value: 45, color: "hsl(var(--chart-1))" },
  { name: "Instagram", value: 30, color: "hsl(var(--chart-2))" },
  { name: "Altro", value: 25, color: "hsl(var(--chart-3))" },
]

const chartTraffic3Months = [
  { name: "Mar", visite: 980, ctaClick: 210, formInviati: 52 },
  { name: "Apr", visite: 1240, ctaClick: 268, formInviati: 67 },
  { name: "Mag", visite: 1410, ctaClick: 315, formInviati: 74 },
]

const chartCityPipeline = [
  { city: "Modena", nuovo: 12, colloquio: 7, formazione: 4 },
  { city: "Sassari", nuovo: 9, colloquio: 5, formazione: 3 },
]

const chartConfig = {
  messaggi: { label: "Messaggi", color: "hsl(var(--chart-1))" },
  candidature: { label: "Candidature", color: "hsl(var(--chart-2))" },
}

const trafficChartConfig = {
  visite: { label: "Visite", color: "hsl(var(--chart-1))" },
  ctaClick: { label: "Click CTA", color: "hsl(var(--chart-2))" },
  formInviati: { label: "Form inviati", color: "hsl(var(--chart-3))" },
}

const cityPipelineConfig = {
  nuovo: { label: "Nuovo", color: "hsl(var(--chart-1))" },
  colloquio: { label: "Colloquio", color: "hsl(var(--chart-2))" },
  formazione: { label: "Formazione", color: "hsl(var(--chart-3))" },
}

const stats = [
  {
    title: "Messaggi contatti",
    value: "6",
    description: "Da leggere",
    icon: MessageSquare,
  },
  {
    title: "Candidature",
    value: "40",
    description: "Totale board Modena + Sassari",
    icon: Briefcase,
  },
  {
    title: "Contenuti CMS",
    value: "7",
    description: "Sezioni editoriali monitorate",
    icon: FileEdit,
  },
] as const

export function Dashboard() {
  const gradientId = useId().replace(/:/g, "")

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Panoramica operativa dei flussi principali (candidature Modena/Sassari + contatti).
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ title, value, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Messaggi e candidature per mese</CardTitle>
            <CardDescription>Panoramica volume richieste e candidature</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={chartSubmissions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} cursor={false} isAnimationActive={false} />
                <Bar dataKey="messaggi" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="candidature" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fonte traffico (candidature)</CardTitle>
            <CardDescription>Distribuzione candidature per sorgente</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: "Candidature" } }} className="h-[240px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} cursor={false} isAnimationActive={false} />
                <Pie
                  data={chartSource}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartSource.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline candidature per città</CardTitle>
            <CardDescription>Focus operativo su Modena e Sassari</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cityPipelineConfig} className="h-[220px] w-full">
              <BarChart data={chartCityPipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="city" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} cursor={false} isAnimationActive={false} />
                <Bar dataKey="nuovo" stackId="city" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="colloquio" stackId="city" fill="hsl(var(--chart-2))" />
                <Bar dataKey="formazione" stackId="city" fill="hsl(var(--chart-3))" radius={[0, 0, 4, 4]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffico ultimi 3 mesi</CardTitle>
            <CardDescription>Visite, click CTA e form inviati</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trafficChartConfig} className="h-[220px] w-full">
              <AreaChart data={chartTraffic3Months}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} cursor={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="visite" stroke="hsl(var(--chart-1))" fill={`url(#${gradientId})`} strokeWidth={2} />
                <Area type="monotone" dataKey="ctaClick" stroke="hsl(var(--chart-2))" fill="none" strokeWidth={2} />
                <Area type="monotone" dataKey="formInviati" stroke="hsl(var(--chart-3))" fill="none" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
