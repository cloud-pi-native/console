import type { ExperimentalFeatureRequest, ExperimentalFeatureScope } from '@cpn-console/shared'
import { experimentalFeatureContract, ExperimentalFeatureTargetSchema } from '@cpn-console/shared'
import { initClient } from '@ts-rest/core'
import { consoleApiFetcher, extractData } from './xhr-client.js'

const client = initClient(experimentalFeatureContract, { baseUrl: '', api: consoleApiFetcher })

export async function listExperimentalFeatureTargets() {
  return ExperimentalFeatureTargetSchema.array().parse(extractData(await client.listTargets(), 200))
}

export async function authorizeExperimentalFeatureTarget(scope: ExperimentalFeatureScope) {
  return ExperimentalFeatureTargetSchema.parse(extractData(await client.authorizeTarget({ body: scope }), 201))
}

export async function requestExperimentalFeatureActivation(id: string, request: ExperimentalFeatureRequest) {
  return ExperimentalFeatureTargetSchema.parse(extractData(await client.requestActivation({ params: { id }, body: request }), 200))
}
