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

const chartConfig = {
  messaggi: { label: "Messaggi", color: "hsl(var(--chart-1))" },
  candidature: { label: "Candidature", color: "hsl(var(--chart-2))" },
}

const stats = [
  {
    title: "Messaggi contatti",
    value: "—",
    description: "Da leggere",
    icon: MessageSquare,
  },
  {
    title: "Candidature",
    value: "—",
    description: "Lavora con noi",
    icon: Briefcase,
  },
  {
    title: "Contenuti CMS",
    value: "—",
    description: "Sezioni modificabili",
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
          Panoramica e accesso rapido alle sezioni dell’admin.
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
            <CardDescription>Dati placeholder – da collegare a Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={chartSubmissions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="messaggi" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="candidature" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fonte traffico (candidature)</CardTitle>
            <CardDescription>Distribuzione per source UTM – dati placeholder</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: "Candidature" } }} className="h-[240px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Trend ultimi mesi</CardTitle>
          <CardDescription>Andamento messaggi contatti – dati placeholder</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ messaggi: { label: "Messaggi", color: "hsl(var(--chart-1))" } }} className="h-[200px] w-full">
            <AreaChart data={chartSubmissions}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="messaggi"
                stroke="hsl(var(--chart-1))"
                fill={`url(#${gradientId})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
