import type { ClientInferRequest } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../../api-client.js'
import { systemSettingsSchema } from '../../schemas/index.js'
import { ErrorSchema } from '../_utils.js'

export const systemSettingsContract = contractInstance.router({
  listSystemSettings: {
    method: 'GET',
    path: `${apiPrefix}/system/settings`,
    summary: 'Get System Settings state',
    description: 'Get System Settings state',
    responses: {
      200: systemSettingsSchema,
      500: ErrorSchema,
    },
  },

  upsertSystemSettings: {
    method: 'POST',
    path: `${apiPrefix}/system/settings`,
    contentType: 'application/json',
    summary: 'Update System Settings state',
    description: 'Update System Settings state',
    body: systemSettingsSchema.partial(),
    responses: {
      201: systemSettingsSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },
})

export type UpsertSystemSettingsBody = ClientInferRequest<typeof systemSettingsContract.upsertSystemSettings>['body']
