import { registerAs } from '@nestjs/config'
import z from 'zod'
import { csv, truthySchema } from './config.utils'

const argocdFeatureSchema = z.object({
  ARGO_NAMESPACE: z.string().default('argocd'),
  ARGOCD_URL: z.string().url(),
  ARGOCD_INTERNAL_URL: z.string().url().optional(),
  ARGOCD_EXTRA_REPOSITORIES: csv(z.string()),
  DSO_ENV_CHART_VERSION: z.string().default('dso-env-1.6.0'),
  DSO_NS_CHART_VERSION: z.string().default('dso-ns-1.1.5'),
  VAULT__DEPLOY_VAULT_CONNECTION_IN_NS: truthySchema.default('false').transform(v => v === 'true' || v === '1'),
}).transform(raw => ({
  namespace: raw.ARGO_NAMESPACE,
  url: raw.ARGOCD_URL,
  internalUrl: raw.ARGOCD_INTERNAL_URL,
  extraRepositories: raw.ARGOCD_EXTRA_REPOSITORIES,
  dsoEnvChartVersion: raw.DSO_ENV_CHART_VERSION,
  dsoNsChartVersion: raw.DSO_NS_CHART_VERSION,
  vaultDeployVaultConnectionInNs: raw.VAULT__DEPLOY_VAULT_CONNECTION_IN_NS,
}))

export type ArgocdConfig = z.infer<typeof argocdFeatureSchema>

export const argocdConfigFactory = registerAs('argocd', () => argocdFeatureSchema.parse(process.env))
