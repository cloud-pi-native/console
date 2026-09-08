import { describe } from 'vitest'

export const canRunKeycloakE2E = Boolean(process.env.E2E)

export const describeWithKeycloak = describe.runIf(canRunKeycloakE2E)
