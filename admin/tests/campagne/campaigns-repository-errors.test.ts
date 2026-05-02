import { describe, expect, it } from "vitest"
import {
  CampaignCidConflictError,
  isCampaignCidConflictError,
} from "../../src/components/campagne/campaigns-repository"

describe("CampaignCidConflictError", () => {
  it("isCampaignCidConflictError riconosce l'istanza", () => {
    const e = new CampaignCidConflictError()
    expect(isCampaignCidConflictError(e)).toBe(true)
    expect(isCampaignCidConflictError(new Error())).toBe(false)
  })
})
