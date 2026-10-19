import type { Environment, Stage } from '@cpn-console/shared'

export interface ProjectResourceUsage {
  hprod: { cpu: number, gpu: number, memory: number }
  prod: { cpu: number, gpu: number, memory: number }
}

export function getProjectResourceUsage({
  environments,
  stages,
  stagesReady,
  environmentsLoaded,
}: {
  environments: Pick<Environment, 'stageId' | 'cpu' | 'gpu' | 'memory'>[]
  stages: Pick<Stage, 'id' | 'name'>[]
  stagesReady: boolean
  environmentsLoaded: boolean
}): ProjectResourceUsage | undefined {
  if (!stagesReady || !environmentsLoaded) return undefined

  const prodStage = stages.find(stage => stage.name === 'prod')
  if (!prodStage) return undefined

  return environments.reduce<ProjectResourceUsage>(
    (usage, environment) => {
      const target = environment.stageId === prodStage.id ? usage.prod : usage.hprod
      target.cpu += environment.cpu
      target.gpu += environment.gpu
      target.memory += environment.memory
      return usage
    },
    {
      hprod: { cpu: 0, gpu: 0, memory: 0 },
      prod: { cpu: 0, gpu: 0, memory: 0 },
    },
  )
}
