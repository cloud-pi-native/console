import type { Stage, StageAssociatedEnvironments } from '@cpn-console/shared'
import type { StageEnvironmentsRecord, StageWithClustersRecord } from './stage-queries.utils'

export function toStage({ clusters, ...stage }: StageWithClustersRecord): Stage {
  return {
    ...stage,
    clusterIds: clusters.map(({ id }) => id),
  }
}

export function toStages(records: StageWithClustersRecord[]): Stage[] {
  return records.map(toStage)
}

export function toStageAssociatedEnvironments(records: StageEnvironmentsRecord[]): StageAssociatedEnvironments {
  return records.map(environment => ({
    project: environment.project.slug,
    name: environment.name,
    cluster: environment.cluster.label,
    owner: environment.project.owner.email,
  }))
}
