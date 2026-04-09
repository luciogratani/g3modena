import type { Cameriere } from "./types"
import { CamerieriTable } from "./CamerieriTable"

type CamerieriCrmPanelProps = {
  items: Cameriere[]
}

/**
 * Left-side CRM content panel.
 * Contains only the waiter table, while actions/filters live in the page toolbar.
 */
export function CamerieriCrmPanel({ items }: CamerieriCrmPanelProps) {
  return (
    <div className="min-h-full">
      <CamerieriTable items={items} />
    </div>
  )
}
