import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))
const nonEmptyString = z.string().transform(value => value.trim() || undefined)

const argocdFeatureSchema = z.object({
  USE_ARGOCD: flagSchema.default(true),
  ARGO_NAMESPACE: z.string().default('argocd'),
  ARGOCD_URL: optionalUrl(z.string()).optional(),
  ARGOCD_INTERNAL_URL: optionalUrl(z.string()).optional(),
  ARGOCD_EXTRA_REPOSITORIES: nonEmptyString.optional(),
  DSO_ENV_CHART_VERSION: z.string().default('dso-env-1.6.0'),
  DSO_NS_CHART_VERSION: z.string().default('dso-ns-1.1.5'),
  VAULT__DEPLOY_VAULT_CONNECTION_IN_NS: flagSchema.default(false),
})

export type ArgoCDRawConfig = z.infer<typeof argocdFeatureSchema>

export interface ArgoCDConfig {
  useArgocd: boolean
  argocdNamespace: string
  argocdUrl: string | undefined
  argocdInternalUrl: string | undefined
  argocdExtraRepositories: string | undefined
  dsoEnvChartVersion: string
  dsoNsChartVersion: string
  vaultDeployVaultConnectionInNs: boolean
  internalOrPublicArgocdUrl: string | undefined
}

function toArgocdConfig(raw: ArgoCDRawConfig): ArgoCDConfig {
  return {
    useArgocd: raw.USE_ARGOCD,
    argocdNamespace: raw.ARGO_NAMESPACE,
    argocdUrl: raw.ARGOCD_URL,
    argocdInternalUrl: raw.ARGOCD_INTERNAL_URL,
    argocdExtraRepositories: raw.ARGOCD_EXTRA_REPOSITORIES,
    dsoEnvChartVersion: raw.DSO_ENV_CHART_VERSION,
    dsoNsChartVersion: raw.DSO_NS_CHART_VERSION,
    vaultDeployVaultConnectionInNs: raw.VAULT__DEPLOY_VAULT_CONNECTION_IN_NS,
    internalOrPublicArgocdUrl: raw.ARGOCD_INTERNAL_URL || raw.ARGOCD_URL || undefined,
  }
}

export const KEY = 'argocd' as const

export const argocdConfigFactory = registerAs(KEY, () =>
  toArgocdConfig(argocdFeatureSchema.parse({
    USE_ARGOCD: process.env.USE_ARGOCD,
    ARGO_NAMESPACE: process.env.ARGO_NAMESPACE,
    ARGOCD_URL: process.env.ARGOCD_URL,
    ARGOCD_INTERNAL_URL: process.env.ARGOCD_INTERNAL_URL,
    ARGOCD_EXTRA_REPOSITORIES: process.env.ARGOCD_EXTRA_REPOSITORIES,
    DSO_ENV_CHART_VERSION: process.env.DSO_ENV_CHART_VERSION,
    DSO_NS_CHART_VERSION: process.env.DSO_NS_CHART_VERSION,
    VAULT__DEPLOY_VAULT_CONNECTION_IN_NS: process.env.VAULT__DEPLOY_VAULT_CONNECTION_IN_NS,
  })))

export default argocdConfigFactory
