import { z } from 'zod'
import { configProjectItemDeclaration } from './config.js'
import { dateToString } from './_utils.js'

export const pluginSchema = z.object({
  description: z.string()
    .optional(),
  title: z.string(),
  name: z.string(),
  imgSrc: z.string()
    .optional(),
  manifest: configProjectItemDeclaration.array(),
})

export const pluginReportSchema = z.object({
  pluginName: z.string(),
  report: z.string().nullable(),
  updatedAt: dateToString.nullable(),
})

export type PluginSchema = Zod.infer<typeof pluginSchema>
export type PluginReport = Zod.infer<typeof pluginReportSchema>
