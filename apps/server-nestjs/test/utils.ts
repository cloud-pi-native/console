import { describe } from 'vitest'

export const describeWithE2E = describe.runIf(Boolean(process.env.E2E))
