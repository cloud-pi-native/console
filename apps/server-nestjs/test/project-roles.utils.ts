import { describe } from 'vitest'

export const canRunProjectRolesE2E = Boolean(process.env.E2E)

export const describeWithProjectRoles = describe.runIf(canRunProjectRolesE2E)
