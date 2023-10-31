import { ClusterModel } from '../cluster'

export type CreateStageDto = {
  body: {
    name: string,
    quotaIds?: string[],
    quotaStage?: Record<string, any>[],
    clusterIds?: ClusterModel['id'][],
    clusters?: ClusterModel[],
  },
}

export type UpdateStageClustersDto = {
  params: {
    stageId: string,
  },
  body: {
    clusterIds?: ClusterModel['id'][],
  }
}

export type DeleteStageDto = {
  params: {
    stageId: string,
  }
}
