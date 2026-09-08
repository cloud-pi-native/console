import { describe } from 'vitest'

export const canRunProjectMembersE2E = Boolean(process.env.E2E)

export const describeWithProjectMembers = describe.runIf(canRunProjectMembersE2E)
