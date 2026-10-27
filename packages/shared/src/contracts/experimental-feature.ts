import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import { ExperimentalFeatureRequestSchema, ExperimentalFeatureScopeSchema, ExperimentalFeatureTargetSchema } from '../schemas/experimental-feature.js'
import { baseHeaders, ErrorSchema } from './_utils.js'

export const experimentalFeatureContract = contractInstance.router({
  listTargets: {
    method: 'GET',
    path: '',
    responses: { 200: ExperimentalFeatureTargetSchema.array(), 401: ErrorSchema, 403: ErrorSchema, 500: ErrorSchema },
  },
  authorizeTarget: {
    method: 'POST',
    path: '/authorizations',
    body: ExperimentalFeatureScopeSchema,
    responses: { 201: ExperimentalFeatureTargetSchema, 400: ErrorSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 500: ErrorSchema },
  },
  requestActivation: {
    method: 'PATCH',
    path: '/:id/request',
    pathParams: z.object({ id: z.string().uuid() }),
    body: ExperimentalFeatureRequestSchema,
    responses: { 200: ExperimentalFeatureTargetSchema, 400: ErrorSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema, 500: ErrorSchema },
  },
}, { baseHeaders, pathPrefix: `${apiPrefix}/experimental-features/opencds` })
