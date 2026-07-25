import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const argocdFeatureSchema = z.object({
  USE_ARGOCD: flag(truthySchema.default('true')),
  ARGO_NAMESPACE: z.string().default('argocd'),
  ARGOCD_URL: nonEmpty(z.string().url()),
  ARGOCD_INTERNAL_URL: nonEmpty(z.string().url()),
  ARGOCD_EXTRA_REPOSITORIES: nonEmpty(z.string()),
  DSO_ENV_CHART_VERSION: z.string().default('dso-env-1.6.0'),
  DSO_NS_CHART_VERSION: z.string().default('dso-ns-1.1.5'),
  VAULT__DEPLOY_VAULT_CONNECTION_IN_NS: flag(truthySchema.default('false')),
}).transform(raw => ({
  enabled: raw.USE_ARGOCD,
  namespace: raw.ARGO_NAMESPACE,
  url: raw.ARGOCD_URL,
  internalUrl: raw.ARGOCD_INTERNAL_URL,
  extraRepositories: raw.ARGOCD_EXTRA_REPOSITORIES,
  dsoEnvChartVersion: raw.DSO_ENV_CHART_VERSION,
  dsoNsChartVersion: raw.DSO_NS_CHART_VERSION,
  vaultDeployVaultConnectionInNs: raw.VAULT__DEPLOY_VAULT_CONNECTION_IN_NS,
  internalOrPublicUrl: raw.ARGOCD_INTERNAL_URL || raw.ARGOCD_URL || undefined,
}))

export const argocdConfigFactory = registerAs('argocd', () => argocdFeatureSchema.parse(process.env))
