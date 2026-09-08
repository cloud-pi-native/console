import { describe } from 'vitest'

export const canRunZoneE2E = Boolean(process.env.E2E)

export const describeWithZone = describe.runIf(canRunZoneE2E)
