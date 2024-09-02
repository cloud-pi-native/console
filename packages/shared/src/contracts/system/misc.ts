import { apiPrefix, contractInstance } from '../../api-client.js'
import { ErrorSchema } from '../_utils.js'
import { healthzSchema, versionSchema } from '../../schemas/index.js'

export const systemContract = contractInstance.router({
  getVersion: {
    method: 'GET',
    path: `${apiPrefix}/version`,
    summary: 'Get version',
    description: 'Retrieve api version.',
    responses: {
      200: versionSchema,
      500: ErrorSchema,
    },
  },

  getHealth: {
    method: 'GET',
    path: `${apiPrefix}/healthz`,
    summary: 'Get health',
    description: 'Retrieve api health infos.',
    responses: {
      200: healthzSchema,
      500: ErrorSchema,
    },
  },
})
