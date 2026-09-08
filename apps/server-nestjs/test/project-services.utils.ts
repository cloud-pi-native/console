import { describe } from 'vitest'

export const canRunServicesE2E = Boolean(process.env.E2E)

export const describeWithServices = describe.runIf(canRunServicesE2E)
