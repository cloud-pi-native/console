import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, truthySchema } from './config.utils'

const pluginFeatureSchema = z.object({
  USE_PLUGINS: flag(truthySchema.default('true')),
  CI: flag(truthySchema.default('false')),
  INTEGRATION: flag(truthySchema.default('false')),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
}).transform((raw) => {
  return { enabled: raw.USE_PLUGINS }
})

export type PluginConfig = z.infer<typeof pluginFeatureSchema>

export const pluginConfigFactory = registerAs('plugin', () => pluginFeatureSchema.parse(process.env))
