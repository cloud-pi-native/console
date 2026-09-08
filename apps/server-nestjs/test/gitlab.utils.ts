import { describe } from 'vitest'

export const canRunGitlabE2E = Boolean(process.env.E2E)

export const describeWithGitLab = describe.runIf(canRunGitlabE2E)
