import type { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client'
import {
  SystemSettingSchema,
  pluginSchema,
  pluginUpdateBody,
} from '../schemas/index.js'
import { ErrorSchema, baseHeaders } from './_utils'

export const systemContract = contractInstance.router({
  getVersion: {
    method: 'GET',
    path: `/version`,
    summary: 'Get version',
    description: 'Retrieve api version.',
    responses: {
      200: z.object({
        version: z.string(),
      }),
      500: ErrorSchema,
    },
  },

  getHealth: {
    method: 'GET',
    path: `/healthz`,
    summary: 'Get health',
    description: 'Retrieve api health infos.',
    responses: {
      200: z.object({
        status: z.enum(['OK', 'KO']),
      }),
      500: ErrorSchema,
    },
  },
}, {
  pathPrefix: `${apiPrefix}`,
})

export const systemPluginContract = contractInstance.router({
  getPluginsConfig: {
    method: 'GET',
    path: '',
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
    path: '',
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
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/system/plugins`,
})

export const systemSettingsContract = contractInstance.router({
  listSystemSettings: {
    method: 'GET',
    path: '',
    summary: 'Get System Settings state',
    description: 'Get System Settings state',
    query: SystemSettingSchema.pick({ key: true })
      .partial(),
    responses: {
      200: SystemSettingSchema.array(),
      500: ErrorSchema,
    },
  },

  upsertSystemSetting: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Update System Settings state',
    description: 'Update System Settings state',
    body: SystemSettingSchema,
    responses: {
      201: SystemSettingSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/system/settings`,
})

export type SystemSettings = ClientInferResponseBody<typeof systemSettingsContract.listSystemSettings, 200>

export type SystemSetting = SystemSettings[number]

export type UpsertSystemSettingBody = ClientInferRequest<typeof systemSettingsContract.upsertSystemSetting>['body']
