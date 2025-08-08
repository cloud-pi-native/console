import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  ServiceChainSchema,
  ServiceChainDetailsSchema,
  ServiceChainFlowsSchema,
} from '../schemas/index.js'
import { EmptySchema, ErrorSchema, baseHeaders } from './_utils.js'
import { ContractNoBody } from '@ts-rest/core'

export const ServiceChainParams = z.object({
  serviceChainId: ServiceChainSchema.shape.id,
})

export const ServiceChainValidationParams = z.object({
  validationId: ServiceChainDetailsSchema.shape.validationId,
})

export const serviceChainContract = contractInstance.router(
  {
    listServiceChains: {
      method: 'GET',
      path: '',
      summary: 'Get Service Chains',
      description: 'Retrieve Service Chains authorized for user',
      responses: {
        200: z.array(ServiceChainSchema),
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },

    getServiceChainDetails: {
      method: 'GET',
      path: `/:serviceChainId`,
      summary: 'Get Service Chain details',
      description: 'Retrieved details of a Service Chain.',
      pathParams: ServiceChainParams,
      responses: {
        200: ServiceChainDetailsSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },

    retryServiceChain: {
      method: 'POST',
      path: `/:serviceChainId/retry`,
      summary: 'Retry Service Chain creation',
      description:
        'Retry the whole service chain creation from the point it failed.',
      pathParams: ServiceChainParams,
      body: ContractNoBody,
      responses: {
        204: null,
        401: ErrorSchema,
        404: ErrorSchema,
        429: EmptySchema, // Already successful, no retry needed
        500: ErrorSchema,
      },
    },

    validateServiceChain: {
      method: 'POST',
      path: `/validate/:validationId`,
      summary: 'Validate Service Chain creation',
      description: 'Trigger the whole service chain creation.',
      pathParams: ServiceChainValidationParams,
      body: ContractNoBody,
      responses: {
        204: null,
        401: ErrorSchema,
        404: ErrorSchema,
        429: EmptySchema, // Validation already done
        500: ErrorSchema,
      },
    },

    getServiceChainFlows: {
      method: 'GET',
      path: `/:serviceChainId/flows`,
      summary: 'Get Service Chain flow details',
      description: 'Retrieved flow details of a Service Chain.',
      pathParams: ServiceChainParams,
      responses: {
        200: ServiceChainFlowsSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },

  },
  {
    baseHeaders,
    pathPrefix: `${apiPrefix}/service-chains`,
  },
)
