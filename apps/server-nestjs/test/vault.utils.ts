import { describe } from 'vitest'

export const canRunVaultE2E = Boolean(process.env.E2E)

export const describeWithVault = describe.runIf(canRunVaultE2E)
