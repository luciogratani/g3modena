import { describe, expect, it } from "vitest"
import {
  CAMPAIGN_CID_PATTERN,
  CAMPAIGN_NAME_MAX,
  generateCampaignCid,
  normalizeBaseUrlForCampaign,
  validateCampaignBuilderSubmit,
} from "../../src/components/campagne/campaign-builder-validation"

describe("generateCampaignCid", () => {
  it("rispetta pattern DB (4–32 chars)", () => {
    for (let i = 0; i < 30; i++) {
      const c = generateCampaignCid()
      expect(c.length).toBeGreaterThanOrEqual(4)
      expect(c.length).toBeLessThanOrEqual(32)
      expect(CAMPAIGN_CID_PATTERN.test(c)).toBe(true)
    }
  })
})

describe("normalizeBaseUrlForCampaign", () => {
  it("rigetta schema assente", () => {
    const r = normalizeBaseUrlForCampaign("g3modena.com/path")
    expect(r.ok).toBe(false)
  })

  it("accetta URL http(s) valido", () => {
    const r = normalizeBaseUrlForCampaign("https://g3modena.com/lavora-con-noi ")
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.startsWith("https://")).toBe(true)
  })
})

describe("validateCampaignBuilderSubmit", () => {
  const file = new File([new Uint8Array([1])], "x.jpg", { type: "image/jpeg" })

  it("fallisce senza utm_campaign", () => {
    const err = validateCampaignBuilderSubmit({
      name: "A",
      subtitle: "B",
      baseUrlRaw: "https://x.com/",
      utmCampaign: "",
      cid: generateCampaignCid(),
      creativeFile: file,
    })
    expect(err).toContain("utm_campaign")
  })

  it("fallisce nome troppo lungo", () => {
    const long = "x".repeat(CAMPAIGN_NAME_MAX + 1)
    const err = validateCampaignBuilderSubmit({
      name: long,
      subtitle: "b",
      baseUrlRaw: "https://x.com/",
      utmCampaign: "c",
      cid: generateCampaignCid(),
      creativeFile: file,
    })
    expect(err).toContain("lungo")
  })
})
