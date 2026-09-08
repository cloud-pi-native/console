import { describe } from 'vitest'

export const canRunLogE2E = Boolean(process.env.E2E)

export const describeWithLog = describe.runIf(canRunLogE2E)
