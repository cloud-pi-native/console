import { describe } from 'vitest'

export const canRunProjectSecretsE2E = Boolean(process.env.E2E)

export const describeWithProjectSecrets = describe.runIf(canRunProjectSecretsE2E)
