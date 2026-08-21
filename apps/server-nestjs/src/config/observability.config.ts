import { registerAs } from '@nestjs/config'
import z from 'zod'
import { urlSchema } from './config.utils'

const observabilityFeatureSchema = z.object({
  GRAFANA_URL: urlSchema,
  DSO_OBSERVABILITY_CHART_VERSION: z.string().min(1),
}).transform(raw => ({
  grafanaUrl: raw.GRAFANA_URL,
  chartVersion: raw.DSO_OBSERVABILITY_CHART_VERSION,
}))

export type ObservabilityConfig = z.infer<typeof observabilityFeatureSchema>

export const observabilityConfigFactory = registerAs('observability', () => observabilityFeatureSchema.parse(process.env))
