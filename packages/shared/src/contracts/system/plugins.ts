import { apiPrefix, contractInstance } from '../../api-client.js'
import {
  pluginUpdateBody,
} from '../../schemas/index.js'
import { ErrorSchema } from '../_utils.js'
import { pluginSchema } from '../../schemas/system/plugins.js'

export const systemPluginContract = contractInstance.router({
  getPluginsConfig: {
    method: 'GET',
    path: `${apiPrefix}/system/plugins`,
    summary: 'Get plugins configuration',
    description: 'Get plugins configuration',
    responses: {
      200: pluginSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updatePluginsConfig: {
    method: 'POST',
    path: `${apiPrefix}/system/plugins`,
    summary: 'Update project service configuration',
    description: 'Update project service configuration',
    body: pluginUpdateBody,
    responses: {
      204: null,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

})
