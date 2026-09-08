import { describe } from 'vitest'

export const canRunArgoCDE2E = Boolean(process.env.E2E)

export const describeWithArgoCD = describe.runIf(canRunArgoCDE2E)
