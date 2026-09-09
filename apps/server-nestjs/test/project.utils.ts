import { describe } from 'vitest'

export const canRunProjectE2E = Boolean(process.env.E2E)

export const describeWithProject = describe.runIf(canRunProjectE2E)
