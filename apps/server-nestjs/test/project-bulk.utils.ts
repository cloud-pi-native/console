import { describe } from 'vitest'

export const canRunProjectBulkE2E = Boolean(process.env.E2E)

export const describeWithProjectBulk = describe.runIf(canRunProjectBulkE2E)
