import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CleanedServiceChainSchema,
  ServiceChainDetailsSchema,
} from '../schemas/index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const ServiceChainParams = z.object({
  serviceChainId: CleanedServiceChainSchema.shape.id,
})

export const serviceChainContract = contractInstance.router({
  listServiceChains: {
    method: 'GET',
    path: '',
    summary: 'Get Service Chains',
    description: 'Retrieve Service Chains authorized for user',
    responses: {
      200: z.array(CleanedServiceChainSchema),
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getServiceChainDetails: {
    method: 'GET',
    path: `/:serviceChainId`,
    summary: 'Get Service Chains details',
    description: 'Retrieved details of a Service Chains.',
    pathParams: ServiceChainParams,
    responses: {
      200: ServiceChainDetailsSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/service-chains`,
})
