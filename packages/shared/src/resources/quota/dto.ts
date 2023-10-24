export type CreateQuotaDto = {
  body: {
    memory: string,
    cpu: number,
    name: string,
    isPrivate?: boolean,
    stageIds?: string[],
    quotaStage?: Record<string, any>[],
  },
}

export type UpdateQuotaPrivacyDto = {
  body: {
    isPrivate?: boolean,
  },
  params: {
    quotaId: string,
  }
}

export type UpdateQuotaStageDto = {
  body: {
    quotaId?: string,
    stageId?: string,
    quotaIds?: string[],
    stageIds?: string[],
    quotaStage?: Record<string, any>[],
  },
}

export type DeleteQuotaDto = {
  params: {
    quotaId: string,
  }
}
