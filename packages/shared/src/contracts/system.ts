import { apiPrefix, contractInstance } from '../api-client.js'
import { GetHealthzSchema, GetSystemPluginSchema, GetVersionSchema, UpdateSystemPluginSchema } from '../schemas/index.js'

export const systemContract = contractInstance.router({
  getVersion: {
    method: 'GET',
    path: `${apiPrefix}/version`,
    summary: 'Get version',
    description: 'Retrieve api version.',
    responses: {
      200: GetVersionSchema.responses['200'],
      500: GetVersionSchema.responses['500'],
    },
  },

  getHealth: {
    method: 'GET',
    path: `${apiPrefix}/healthz`,
    summary: 'Get health',
    description: 'Retrieve api health infos.',
    responses: {
      200: GetHealthzSchema.responses['200'],
      500: GetHealthzSchema.responses['500'],
    },
  },
})

export const systemPluginContract = contractInstance.router({
  getPluginsConfig: {
    method: 'GET',
    path: `${apiPrefix}/system/plugins`,
    summary: 'Get plugins configuration',
    description: 'Get plugins configuration',
    responses: GetSystemPluginSchema.responses,
  },

  updatePluginsConfig: {
    method: 'POST',
    path: `${apiPrefix}/system/plugins`,
    summary: 'Update project service configuration',
    description: 'Update project service configuration',
    body: UpdateSystemPluginSchema.body,
    responses: UpdateSystemPluginSchema.responses,
  },
})
