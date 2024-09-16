import { z } from 'zod'
import { pluginsPopulatedManifests, pluginUpdateBody } from './config.js'
import { ProjectParams } from './project.js'
import { ErrorSchema } from './utils.js'

export const serviceUrl = z.object({
  to: z.string(),
  name: z.string(),
})

export type ServiceUrl = Zod.infer<typeof serviceUrl>

export const ServiceSchema = z.object({
  description: z.string()
    .optional(),
  title: z.string(),
  name: z.string(),
  imgSrc: z.string()
    .optional(),
  urls: serviceUrl.array(),
  manifest: pluginsPopulatedManifests,
})

export const permissionTarget = z.enum(['user', 'admin']).default('user')
export type PermissionTarget = Zod.infer<typeof permissionTarget>

export const GetProjectServicesSchema = {
  query: z.object({ permissionTarget }),
  params: ProjectParams,
  responses: {
    200: ServiceSchema.array(),
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateProjectServicesSchema = {
  params: ProjectParams,
  body: pluginUpdateBody,
  responses: {
    204: null,
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export type ProjectService = Zod.infer<typeof ServiceSchema>
