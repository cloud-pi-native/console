import { z } from 'zod'
import { ErrorSchema } from './utils.js'
import { configProjectItemDeclaration, pluginUpdateBody } from './config.js'

export const pluginSchema = z.object({
  description: z.string()
    .optional(),
  title: z.string(),
  name: z.string(),
  imgSrc: z.string()
    .optional(),
  manifest: configProjectItemDeclaration.array(),
})

export type PluginSchema = Zod.infer<typeof pluginSchema>

export const SystemSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
})

export const GetVersionSchema = {
  responses: {
    200: z.object({
      version: z.string(),
    }),
    500: ErrorSchema,
  },
}

export const GetHealthzSchema = {
  responses: {
    200: z.object({
      status: z.enum(['OK', 'KO']),
    }),
    500: ErrorSchema,
  },
}

export const GetSystemPluginSchema = {
  responses: {
    200: pluginSchema.array(),
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateSystemPluginSchema = {
  body: pluginUpdateBody,
  responses: {
    204: null,
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const ListSystemSettingsSchema = {
  query: SystemSettingSchema.pick({ key: true })
    .partial().strict(),
  responses: {
    200: SystemSettingSchema.array(),
    500: ErrorSchema,
  },
}

export const UpsertSystemSettingsSchema = {
  body: SystemSettingSchema,
  responses: {
    201: SystemSettingSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}
