import { describe } from 'vitest'

export const canRunNexusE2E = Boolean(process.env.E2E)

export const describeWithNexus = describe.runIf(canRunNexusE2E)
