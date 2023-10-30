export type QuotaModel = {
  id?: string,
  memory: string,
  cpu: number,
  name: string,
  isPrivate?: boolean,
}

export type QuotaStageModel = {
  id?: string,
  quotaId: QuotaModel['id'],
  stageId: string,
  status?: string,
  environments?: any[],
  quota?: QuotaModel[],
  stage?: any[],
}
