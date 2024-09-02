import { z } from 'zod'

export const systemSettingsSchema = z.object({
  maintenance: z.string(),
  appName: z.string(),
  contactMail: z.string(),
  appSubTitle: z.string(),
})

export type SystemSettings = z.infer<typeof systemSettingsSchema>

export const systemSettingsDefaultSchema = z.object({
  maintenance: systemSettingsSchema._def.shape().maintenance.default('false'),
  appName: systemSettingsSchema._def.shape().appName.default('Console Cloud π Native'),
  contactMail: systemSettingsSchema._def.shape().contactMail.default('cloudpinative-relations@interieur.gouv.fr'),
  appSubTitle: systemSettingsSchema._def.shape().appSubTitle.default('Ministère, de l’intérieur, et des outre-mer'),
})
