import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type PagePlaceholderProps = {
  title: string
  description: string
  badge?: string
}

export function PagePlaceholder({ title, description, badge = "In arrivo" }: PagePlaceholderProps) {
  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </header>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Contenuto in arrivo</CardTitle>
            <Badge variant="secondary">{badge}</Badge>
          </div>
          <CardDescription>
            I campi e l’integrazione saranno disponibili in un prossimo aggiornamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Questa sezione è in fase di sviluppo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
