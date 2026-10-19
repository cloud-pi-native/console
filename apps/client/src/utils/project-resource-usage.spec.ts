import type { Environment, Stage } from '@cpn-console/shared'
import { describe, expect, it } from 'vitest'
import { getProjectResourceUsage } from './project-resource-usage.js'

type UsageEnvironment = Pick<Environment, 'stageId' | 'cpu' | 'gpu' | 'memory'>
type UsageStage = Pick<Stage, 'id' | 'name'>

const stages: UsageStage[] = [
  { id: 'prod-stage', name: 'prod' },
  { id: 'hprod-stage', name: 'hprod' },
]

const environments: UsageEnvironment[] = [
  { stageId: 'prod-stage', cpu: 2, gpu: 1, memory: 4 },
  { stageId: 'hprod-stage', cpu: 3, gpu: 2, memory: 5 },
]

describe('getProjectResourceUsage', () => {
  it('does not return totals before stages are loaded', () => {
    expect(getProjectResourceUsage({ environments, stages, stagesReady: false, environmentsLoaded: true })).toBeUndefined()
  })

  it('does not return totals before environments are loaded', () => {
    expect(getProjectResourceUsage({ environments, stages, stagesReady: true, environmentsLoaded: false })).toBeUndefined()
  })

  it('does not return totals if the production stage is unavailable', () => {
    expect(getProjectResourceUsage({ environments, stages: [], stagesReady: true, environmentsLoaded: true })).toBeUndefined()
  })

  it('sums production and non-production resources separately after loading', () => {
    expect(getProjectResourceUsage({ environments, stages, stagesReady: true, environmentsLoaded: true })).toEqual({
      hprod: { cpu: 3, gpu: 2, memory: 5 },
      prod: { cpu: 2, gpu: 1, memory: 4 },
    })
  })
})
