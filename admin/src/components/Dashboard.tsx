import { useEffect, useId, useState } from "react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Briefcase, Activity } from "lucide-react"
import {
  loadDashboardData,
  type CandidateSourceBucket,
  type CandidatesPerMonthBucket,
  type CityPipelineBucket,
  type DashboardData,
  type DashboardStats,
  type TrafficMonthBucket,
} from "./dashboard/dashboard-repository"

const candidatesChartConfig = {
  candidates: { label: "Candidature", color: "hsl(var(--chart-2))" },
}

const sourceChartConfig = {
  value: { label: "Candidature" },
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
  altro: { label: "Altro", color: "hsl(var(--chart-4))" },
}

const SOURCE_PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const STATS_SKELETON_KEYS = ["dashboard-stat-sk-1", "dashboard-stat-sk-2", "dashboard-stat-sk-3"] as const
const CHART_SKELETON_KEYS = [
  "dashboard-chart-sk-1",
  "dashboard-chart-sk-2",
  "dashboard-chart-sk-3",
  "dashboard-chart-sk-4",
] as const

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
      {message}
    </div>
  )
}

function StatsRow({ stats }: { stats: DashboardStats }) {
  const items = [
    {
      title: "Messaggi nuovi",
      value: String(stats.newMessagesCount),
      description: "Da leggere in inbox contatti",
      icon: MessageSquare,
    },
    {
      title: "Candidature totali",
      value: String(stats.candidatesTotal),
      description: "Tutte le sedi (board candidati)",
      icon: Briefcase,
    },
    {
      title: "Eventi ingest 30gg",
      value: String(stats.ingestEvents30d),
      description: "Eventi analytics ricevuti",
      icon: Activity,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ title, value, description, icon: Icon }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CandidaturePerMeseCard({ data }: { data: CandidatesPerMonthBucket[] }) {
  const hasAny = data.some((bucket) => bucket.candidates > 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidature per mese</CardTitle>
        <CardDescription>Volume candidature ricevute negli ultimi 6 mesi</CardDescription>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <ChartContainer config={candidatesChartConfig} className="h-[240px] w-full">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} isAnimationActive={false} />
              <Bar dataKey="candidates" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartEmpty message="Nessuna candidatura registrata negli ultimi 6 mesi." />
        )}
      </CardContent>
    </Card>
  )
}

function FonteTrafficoCard({ data }: { data: CandidateSourceBucket[] }) {
  const hasAny = data.length > 0 && data.some((row) => row.value > 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fonte traffico (candidature)</CardTitle>
        <CardDescription>
          Distribuzione per <span className="font-mono">utm_source</span>; le candidature senza
          attribution finiscono in "Diretto/Sconosciuto".
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <ChartContainer config={sourceChartConfig} className="h-[240px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} isAnimationActive={false} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={SOURCE_PALETTE[index % SOURCE_PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <ChartEmpty message="Nessuna candidatura disponibile per calcolare la fonte traffico." />
        )}
      </CardContent>
    </Card>
  )
}

function PipelineCittaCard({ data }: { data: CityPipelineBucket[] }) {
  const hasAny = data.length > 0
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline candidature per città</CardTitle>
        <CardDescription>
          Conteggio per stage operativo (nuovo, colloquio, formazione) + altre fasi raggruppate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <ChartContainer config={cityPipelineConfig} className="h-[220px] w-full">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="city" />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} isAnimationActive={false} />
              <Bar dataKey="nuovo" stackId="city" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="colloquio" stackId="city" fill="hsl(var(--chart-2))" />
              <Bar dataKey="formazione" stackId="city" fill="hsl(var(--chart-3))" />
              <Bar dataKey="altro" stackId="city" fill="hsl(var(--chart-4))" radius={[0, 0, 4, 4]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartEmpty message="Nessuna candidatura attribuita a una sede." />
        )}
      </CardContent>
    </Card>
  )
}

function TrafficoCard({ data, gradientId }: { data: TrafficMonthBucket[]; gradientId: string }) {
  const hasAny = data.some((b) => b.visite + b.ctaClick + b.formInviati > 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffico ultimi 3 mesi</CardTitle>
        <CardDescription>Visite (page_view), click CTA, form inviati (careers_submit)</CardDescription>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <ChartContainer config={trafficChartConfig} className="h-[220px] w-full">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="visite" stroke="hsl(var(--chart-1))" fill={`url(#${gradientId})`} strokeWidth={2} />
              <Area type="monotone" dataKey="ctaClick" stroke="hsl(var(--chart-2))" fill="none" strokeWidth={2} />
              <Area type="monotone" dataKey="formInviati" stroke="hsl(var(--chart-3))" fill="none" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <ChartEmpty message="Nessun evento analytics negli ultimi 3 mesi." />
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[112px] w-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {CHART_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[280px] w-full" />
        ))}
      </div>
    </>
  )
}

export function Dashboard() {
  const gradientId = useId().replace(/:/g, "")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadDashboardData()
      .then((result) => {
        if (cancelled) return
        setData(result)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Impossibile caricare la dashboard.")
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Panoramica operativa dei flussi principali (candidature, contatti, eventi analytics).
        </p>
      </header>

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Caricamento dashboard non riuscito</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <StatsRow stats={data.stats} />

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <CandidaturePerMeseCard data={data.candidatesPerMonth} />
            <FonteTrafficoCard data={data.sourceDistribution} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <PipelineCittaCard data={data.cityPipeline} />
            <TrafficoCard data={data.trafficLast3Months} gradientId={gradientId} />
          </div>
        </>
      )}
    </div>
  )
}
