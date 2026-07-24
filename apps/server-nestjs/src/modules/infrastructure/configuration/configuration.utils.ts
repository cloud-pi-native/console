import { z } from 'zod'

export const nodeEnvSchema = z.enum(['development', 'production', 'test'])

export const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))

const nonEmptyString = z.string().transform(value => value.trim() || undefined)

const baseConfigurationSchema = z
  .object({
    NODE_ENV: nodeEnvSchema.optional(),
    INTEGRATION: flagSchema.optional(),
    CI: flagSchema.optional(),
    DEV_SETUP: flagSchema.optional(),
    DOCKER: flagSchema.optional(),
    SERVER_HOST: z.string().default('localhost'),
    SERVER_PORT: z.string().transform(Number).default('0'),
    APP_VERSION: z.string().optional(),
    DB_URL: z.string().url().optional(),
    SESSION_SECRET: z.string().min(32).optional(),
    CONTACT_EMAIL: z.string().email().default('cloudpinative-relations@interieur.gouv.fr'),
    MOCK_PLUGINS: flagSchema.optional(),
    PROJECTS_ROOT_DIR: nonEmptyString.optional(),
    PLUGINS_DIR: z.string().default('/plugins'),
    HTTP_PROXY: optionalUrl(z.string()).optional(),
    HTTPS_PROXY: optionalUrl(z.string()).optional(),
  })
  .passthrough()
  .transform(config => ({
    ...config,
    NODE_ENV: config.NODE_ENV === 'test' ? 'test' : config.NODE_ENV === 'development' ? 'development' : 'production',
  }))

export type BaseConfiguration = z.infer<typeof baseConfigurationSchema>

export function validateBaseConfig(config: Record<string, unknown>) {
  return baseConfigurationSchema.parse(config)
}

export const keycloakFeatureSchema = z.object({
  USE_KEYCLOAK: flagSchema.default(true),
  KEYCLOAK_PROTOCOL: z.string().default('https'),
  KEYCLOAK_DOMAIN: nonEmptyString,
  KEYCLOAK_PUBLIC_PROTOCOL: z.string().default('https'),
  KEYCLOAK_PUBLIC_DOMAIN: nonEmptyString,
  KEYCLOAK_REALM: nonEmptyString,
  KEYCLOAK_CLIENT_ID: nonEmptyString,
  KEYCLOAK_CLIENT_SECRET: nonEmptyString,
  KEYCLOAK_ADMIN: nonEmptyString,
  KEYCLOAK_ADMIN_PASSWORD: nonEmptyString,
  KEYCLOAK_REDIRECT_URI: optionalUrl(z.string()).optional(),
  KEYCLOAK_JWKS_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  KEYCLOAK_JWKS_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  ADMIN_KC_USER_ID: z.preprocess(
    value => (typeof value === 'string' ? value.split(',').map(part => part.trim()).filter(Boolean) : value),
    z.array(z.string()).default([]),
  ),
})

export const argocdFeatureSchema = z.object({
  USE_ARGOCD: flagSchema.default(true),
  ARGO_NAMESPACE: z.string().default('argocd'),
  ARGOCD_URL: optionalUrl(z.string()).optional(),
  ARGOCD_INTERNAL_URL: optionalUrl(z.string()).optional(),
  ARGOCD_EXTRA_REPOSITORIES: nonEmptyString.optional(),
  DSO_ENV_CHART_VERSION: z.string().default('dso-env-1.6.0'),
  DSO_NS_CHART_VERSION: z.string().default('dso-ns-1.1.5'),
  VAULT__DEPLOY_VAULT_CONNECTION_IN_NS: flagSchema.default(false),
})

export const gitlabFeatureSchema = z.object({
  USE_GITLAB: flagSchema.default(true),
  GITLAB_TOKEN: nonEmptyString,
  GITLAB_URL: optionalUrl(z.string()).optional(),
  GITLAB_INTERNAL_URL: optionalUrl(z.string()).optional(),
  GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS: z.coerce.number().int().positive().default(180),
  GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
})

export const vaultFeatureSchema = z.object({
  USE_VAULT: flagSchema.default(true),
  VAULT_TOKEN: nonEmptyString,
  VAULT_URL: optionalUrl(z.string()).optional(),
  VAULT_INTERNAL_URL: optionalUrl(z.string()).optional(),
  VAULT_KV_NAME: z.string().default('forge-dso'),
})

export const harborFeatureSchema = z.object({
  USE_HARBOR: flagSchema.default(true),
  HARBOR_URL: optionalUrl(z.string()).optional(),
  HARBOR_INTERNAL_URL: optionalUrl(z.string()).optional(),
  HARBOR_ADMIN: nonEmptyString,
  HARBOR_ADMIN_PASSWORD: nonEmptyString,
  HARBOR_RULE_TEMPLATE: nonEmptyString.optional(),
  HARBOR_RULE_COUNT: z.coerce.number().int().nonnegative().optional(),
  HARBOR_RETENTION_CRON: z.string().default('0 22 2 * * *'),
  HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  HARBOR_PROJECT_SLUG_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
})

export const nexusFeatureSchema = z.object({
  USE_NEXUS: flagSchema.default(true),
  NEXUS_URL: optionalUrl(z.string()).optional(),
  NEXUS_INTERNAL_URL: optionalUrl(z.string()).optional(),
  NEXUS_ADMIN: nonEmptyString,
  NEXUS_ADMIN_PASSWORD: nonEmptyString,
  NEXUS__SECRET_EXPOSE_INTERNAL_URL: flagSchema.default(false),
})

export const opencdsFeatureSchema = z.object({
  USE_OPENCDS: flagSchema.default(true),
  OPENCDS_URL: optionalUrl(z.string()).optional(),
  OPENCDS_API_TOKEN: nonEmptyString,
  OPENCDS_API_TLS_REJECT_UNAUTHORIZED: flagSchema.default(false),
})

export const sonarqubeFeatureSchema = z.object({
  USE_SONARQUBE: flagSchema.default(true),
  SONARQUBE_URL: optionalUrl(z.string()).optional(),
  SONARQUBE_INTERNAL_URL: optionalUrl(z.string()).optional(),
  SONAR_API_TOKEN: nonEmptyString,
})

export function validateKeycloakConfig(config: Record<string, unknown>) {
  return keycloakFeatureSchema.parse(config)
}

export function validateArgoCDConfig(config: Record<string, unknown>) {
  return argocdFeatureSchema.parse(config)
}

export function validateGitlabConfig(config: Record<string, unknown>) {
  return gitlabFeatureSchema.parse(config)
}

export function validateVaultConfig(config: Record<string, unknown>) {
  return vaultFeatureSchema.parse(config)
}

export function validateHarborConfig(config: Record<string, unknown>) {
  return harborFeatureSchema.parse(config)
}

export function validateNexusConfig(config: Record<string, unknown>) {
  return nexusFeatureSchema.parse(config)
}

export function validateOpenCDSConfig(config: Record<string, unknown>) {
  return opencdsFeatureSchema.parse(config)
}

export const registryFeatureSchema = z.object({
  USE_REGISTRY: flagSchema.default(true),
  REGISTRY_URL: optionalUrl(z.string()).optional(),
  REGISTRY_INTERNAL_URL: optionalUrl(z.string()).optional(),
  REGISTRY_ADMIN: nonEmptyString,
  REGISTRY_ADMIN_PASSWORD: nonEmptyString,
  REGISTRY_RULE_TEMPLATE: nonEmptyString.optional(),
  REGISTRY_RULE_COUNT: z.coerce.number().int().nonnegative().optional(),
  REGISTRY_RETENTION_CRON: z.string().default('0 22 2 * * *'),
  REGISTRY_ROBOT_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  REGISTRY_PROJECT_SLUG_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
})

export function validateSonarqubeConfig(config: Record<string, unknown>) {
  return sonarqubeFeatureSchema.parse(config)
}

export function validateRegistryConfig(config: Record<string, unknown>) {
  return registryFeatureSchema.parse(config)
}
