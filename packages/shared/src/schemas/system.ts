import type Zod from 'zod'
import { z } from 'zod'
import { configProjectItemDeclaration } from './config.js'

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
