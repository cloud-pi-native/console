import type Zod from 'zod'
import { z } from 'zod'
import { pluginsPopulatedManifests } from './config.js'

export const serviceUrl = z.object({
  to: z.string(),
  name: z.string(),
  description: z.string()
    .optional(),
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
export type ProjectService = Zod.infer<typeof ServiceSchema>

export const ServiceHealthSchema = z.object({
  name: z.string(),
  status: z.enum(['OK', 'Dégradé', 'En échec', 'Inconnu']),
  interval: z.number(),
  lastUpdateTimestamp: z.number(),
  message: z.string(),
})
