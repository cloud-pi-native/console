import { describe } from 'vitest'

export const canRunRegistryE2E = Boolean(process.env.E2E)

export const describeWithRegistry = describe.runIf(canRunRegistryE2E)
