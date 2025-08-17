import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  pluginSchema,
  pluginReportSchema,
  pluginUpdateBody,
} from '../schemas/index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const systemPluginContract = contractInstance.router({
  listPlugins: {
    method: 'GET',
    path: '',
    summary: 'List available plugins',
    description: 'List available plugins',
    responses: {
      200: pluginSchema.omit({ manifest: true, description: true }).array(),
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getPluginsConfig: {
    method: 'GET',
    path: '/config',
    summary: 'Get plugins configuration',
    description: 'Get plugins configuration',
    responses: {
      200: pluginSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getPluginConfig: {
    method: 'GET',
    path: '/:name/config',
    summary: 'Get plugin configuration',
    pathParams: z.object({ name: z.string() }),
    description: 'Get plugin configuration',
    responses: {
      200: pluginSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getPluginReport: {
    method: 'GET',
    path: '/:name/report',
    pathParams: z.object({ name: z.string() }),
    summary: 'Get plugin last report',
    description: 'Get plugin last report',
    responses: {
      200: pluginReportSchema.nullable(),
      400: ErrorSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  deletePluginReport: {
    method: 'DELETE',
    path: '/:name/report',
    pathParams: z.object({ name: z.string() }),
    summary: 'Delete plugin last report',
    description: 'Delete plugin last report',
    responses: {
      200: null,
      400: ErrorSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updatePluginsConfig: {
    method: 'POST',
    path: '/config',
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

  // executePluginAction: {
  //   method: 'POST',
  //   path: '/:name/:action',
  //   summary: 'Execute a plugin\'s action',
  //   description: 'Execute a plugin\'s action',
  //   body: z.any(),
  //   responses: {
  //     204: null,
  //     400: ErrorSchema,
  //     401: ErrorSchema,
  //     403: ErrorSchema,
  //     500: ErrorSchema,
  //   },
  // },

  // getPluginActionStatus: {
  //   method: 'GET',
  //   path: '/:name/actions/:action/status',
  //   summary: 'Get a plugin\'s action status',
  //   description: 'Get a plugin\'s action status',
  //   responses: {
  //     204: z.any(),
  //     400: ErrorSchema,
  //     401: ErrorSchema,
  //     403: ErrorSchema,
  //     500: ErrorSchema,
  //   },
  // },

  // getEveryPluginActionStatuses: {
  //   method: 'GET',
  //   path: '/:name/actions/status',
  //   summary: 'Get all plugin\'s action statuses',
  //   description: 'Get all plugin\'s action statuses',
  //   responses: {
  //     204: z.any(),
  //     400: ErrorSchema,
  //     401: ErrorSchema,
  //     403: ErrorSchema,
  //     500: ErrorSchema,
  //   },
  // },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/plugins`,
})
