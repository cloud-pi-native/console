import { z } from 'zod'
import { configProjectItemDeclaration } from './config.js'

export const PluginSchema = z.object({
  description: z.string()
    .optional(),
  title: z.string(),
  name: z.string(),
  imgSrc: z.string()
    .optional(),
  manifest: configProjectItemDeclaration.array(),
})

export type Plugin = Zod.infer<typeof PluginSchema>

export const SettingsSchema = z.object({
  maintenance: z.string().default('off'),
  appName: z.string().default('Console Cloud Pi Native TEST DE FOU'),
  contactMail: z.string().default('cloudpinative-relations@interieur.gouv.fr'),
  appSubTitle: z.array(z.string()).default(['Ministère 1', 'de l’intérieur 2', 'et des outre-mer 3']),
}).strict()

export type Settings = Zod.infer<typeof SettingsSchema>
