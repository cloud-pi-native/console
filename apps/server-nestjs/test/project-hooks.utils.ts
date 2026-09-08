import { describe } from 'vitest'

export const canRunProjectHooksE2E = Boolean(process.env.E2E)

export const describeWithProjectHooks = describe.runIf(canRunProjectHooksE2E)
