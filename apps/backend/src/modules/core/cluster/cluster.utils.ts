import type { CleanedCluster, ClusterAssociatedEnvironments, ClusterDetails } from '@cpn-console/shared'
import type { ClusterDetailsRecord, ClusterEnvironmentsRecord, ClusterListRecord } from './cluster-queries.utils'
import { KubeconfigSchema } from '@cpn-console/shared'

export function toClusters(records: ClusterListRecord[]): CleanedCluster[] {
  return records.map((record) => {
    const { stages, infos, secretName, kubeConfigId, createdAt, updatedAt, ...cluster } = record
    return {
      ...cluster,
      infos: infos ?? '',
      stageIds: stages.map(({ id }) => id),
    }
  })
}

export function toClusterDetails(record: ClusterDetailsRecord): ClusterDetails {
  const { infos, projects, stages, kubeconfig, secretName, kubeConfigId, createdAt, updatedAt, ...details } = record
  return {
    ...details,
    infos: infos ?? '',
    projectIds: projects.map(project => project.id),
    stageIds: stages.map(({ id }) => id),
    kubeconfig: {
      cluster: KubeconfigSchema.shape.cluster.passthrough().parse(kubeconfig.cluster),
      user: KubeconfigSchema.shape.user.passthrough().parse(kubeconfig.user),
    },
  }
}

export function toClusterAssociatedEnvironments(records: ClusterEnvironmentsRecord[]): ClusterAssociatedEnvironments {
  return records.map(environment => ({
    project: environment.project?.name,
    name: environment.name,
    owner: environment.project?.owner.email,
    cpu: environment.cpu,
    gpu: environment.gpu,
    memory: environment.memory,
  }))
}
