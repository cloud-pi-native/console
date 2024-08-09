import { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  GetHealthzSchema,
  GetSystemPluginSchema,
  ListSystemSettingsSchema,
  GetVersionSchema,
  UpdateSystemPluginSchema,
  UpsertSystemSettingsSchema,
} from '../schemas/index.js'

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

export const systemSettingsContract = contractInstance.router({
  listSystemSettings: {
    method: 'GET',
    path: `${apiPrefix}/system/settings`,
    query: ListSystemSettingsSchema.query,
    summary: 'Get System Settings state',
    description: 'Get System Settings state',
    responses: ListSystemSettingsSchema.responses,
  },

  upsertSystemSetting: {
    method: 'POST',
    path: `${apiPrefix}/system/settings`,
    contentType: 'application/json',
    summary: 'Update System Settings state',
    description: 'Update System Settings state',
    body: UpsertSystemSettingsSchema.body,
    responses: UpsertSystemSettingsSchema.responses,
  },
})

export type SystemSettings = ClientInferResponseBody<typeof systemSettingsContract.listSystemSettings, 200>

export type SystemSetting = SystemSettings[number]

export type UpsertSystemSettingBody = ClientInferRequest<typeof systemSettingsContract.upsertSystemSetting>['body']
