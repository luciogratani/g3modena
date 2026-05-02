import { describe, expect, it } from "vitest"
import {
  CAMPAIGN_INACTIVE_THRESHOLD_DAYS,
  getCampaignLifecycle,
  rowToCampaignRecord,
  type CampaignDbRow,
} from "../../src/components/campagne/campaigns-repository"
import { EMPTY_CAMPAIGN_METRICS } from "../../src/components/campagne/types"

const baseRow: CampaignDbRow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: " Test ",
  subtitle: " Sotto ",
  cid: "ab12cd34",
  base_url: "https://example.com/landing",
  utm_source: "ig",
  utm_medium: "paid",
  utm_campaign: "summer",
  utm_term: null,
  utm_content: "story",
  creative_image_path: "preview/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
  starts_at: "2026-01-01T12:00:00.000Z",
  first_data_at: null,
  last_data_at: null,
  created_at: "2026-01-02T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
}

describe("getCampaignLifecycle", () => {
  it('returns waiting_data quando first_data_at è assente', () => {
    expect(getCampaignLifecycle(null, null)).toBe("waiting_data")
    expect(getCampaignLifecycle("", "2026-05-01T00:00:00.000Z")).toBe("waiting_data")
  })

  it("returns active quando ultimo evento entro la soglia (5 giorni)", () => {
    const now = new Date("2026-05-10T12:00:00.000Z").getTime()
    const last = "2026-05-09T12:00:00.000Z"
    expect(getCampaignLifecycle("2026-05-01T00:00:00.000Z", last, now)).toBe("active")
  })

  it("returns inactive quando ultimo evento oltre la soglia", () => {
    const now = new Date("2026-05-10T12:00:00.000Z").getTime()
    const last = new Date(now - (CAMPAIGN_INACTIVE_THRESHOLD_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString()
    expect(getCampaignLifecycle("2026-05-01T00:00:00.000Z", last, now)).toBe("inactive")
  })

  it("usa first_data_at come fallback se last_data_at è vuoto", () => {
    const now = new Date("2026-05-10T12:00:00.000Z").getTime()
    const first = "2026-05-09T18:00:00.000Z"
    expect(getCampaignLifecycle(first, null, now)).toBe("active")
  })
})

describe("rowToCampaignRecord", () => {
  it("mappa snake_case → camelCase e metriche vuote", () => {
    const r = rowToCampaignRecord(baseRow)
    expect(r.id).toBe(baseRow.id)
    expect(r.name).toBe(" Test ")
    expect(r.startsAt).toBe(baseRow.starts_at)
    expect(r.baseUrl).toBe(baseRow.base_url)
    expect(r.utmTerm).toBe("")
    expect(r.creativePreview).toBe("preview/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png")
    expect(r.metrics).toEqual(EMPTY_CAMPAIGN_METRICS)
  })
})
