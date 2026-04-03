import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type PageLoadingFallbackProps = {
  title: string
  description?: string
}

export function PageLoadingFallback({ title, description = "Caricamento in corso..." }: PageLoadingFallbackProps) {
  return (
    <div className="min-h-full bg-background p-6">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    </div>
  )
}
