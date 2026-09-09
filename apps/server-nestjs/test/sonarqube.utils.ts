import { describe } from 'vitest'

export const canRunSonarqubeE2E = Boolean(process.env.E2E)

export const describeWithSonarqube = describe.runIf(canRunSonarqubeE2E)
