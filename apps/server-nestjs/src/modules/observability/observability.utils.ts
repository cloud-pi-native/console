import type { ProjectWithDetails } from './observability-datastore.service'
import { specificallyDisabled } from '@cpn-console/hooks'
import { compressUUID, getPermsByUserRoles, ProjectAuthorized } from '@cpn-console/shared'
import { urlSchema } from '../../config/config.utils'
import { stringify } from 'yaml'
import z from 'zod'
import {
  ENABLED_PLUGIN_KEY,
  GRAFANA_GROUP_NAME,
  GRAFANA_SUBGROUP_HPROD_RO,
  GRAFANA_SUBGROUP_HPROD_RW,
  GRAFANA_SUBGROUP_PROD_RO,
  GRAFANA_SUBGROUP_PROD_RW,
  HPROD_ENV,
  PLUGIN_NAME,
  PROD_ENV,
} from './observability.constants'

export type GrafanaSubGroupName
  = | typeof GRAFANA_SUBGROUP_HPROD_RW
    | typeof GRAFANA_SUBGROUP_HPROD_RO
    | typeof GRAFANA_SUBGROUP_PROD_RW
    | typeof GRAFANA_SUBGROUP_PROD_RO

export type EnvType = 'prod' | 'hprod'

export function isProdStage(stage?: { name?: string } | null): boolean {
  return stage?.name === PROD_ENV
}

const tenantMapSchema = z.record(z.string(), z.record(z.string(), z.unknown()))

const envSchema = z.object({
  groups: z.array(z.string()).optional(),
  tenants: tenantMapSchema,
})

export const observabilityProjectSchema = z.object({
  projectName: z.string(),
  projectRepository: z.object({
    url: z.string(),
    path: z.string(),
  }),
  envs: z.object({
    prod: envSchema.optional(),
    hprod: envSchema.optional(),
  }),
})

export const observabilityDataSchema = z.object({
  global: z.object({
    tenants: tenantMapSchema.optional(),
    projects: z.record(z.string(), observabilityProjectSchema).optional(),
  }),
})

export type ObservabilityProject = z.infer<typeof observabilityProjectSchema>
export type ObservabilityData = z.infer<typeof observabilityDataSchema>

export const observabilityYamlInitData: ObservabilityData = {
  global: {
    tenants: {},
  },
}

export type ListPerms = Record<'prod' | 'hors-prod', Record<'view' | 'edit', string[]>>

export function getListPerms(project: ProjectWithDetails): ListPerms {
  const rolesById = Object.fromEntries(project.roles.map(r => [r.id, r]))
  const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])

  const perms: ListPerms = {
    'hors-prod': { edit: [], view: [] },
    prod: { edit: [], view: [] },
  }

  for (const userId of projectUserIds) {
    const { ro, rw } = resolveUserPerms(project, rolesById, userId)
    const hasProd = project.environments.some(e => isProdStage(e.stage))
    const bucket = hasProd ? perms.prod : perms['hors-prod']
    if (rw && !bucket.edit.includes(userId)) bucket.edit.push(userId)
    if (ro && !bucket.view.includes(userId)) bucket.view.push(userId)
  }

  return perms
}

function resolveUserPerms(
  project: ProjectWithDetails,
  rolesById: Record<string, ProjectWithDetails['roles'][number]>,
  userId: string,
) {
  if (userId === project.ownerId) return { ro: true, rw: true }

  const member = project.members.find(m => m.user.id === userId)
  if (!member) return { ro: false, rw: false }

  const projectPermissions = getPermsByUserRoles(member.roleIds, rolesById, project.everyonePerms)
  return {
    ro: ProjectAuthorized.ListEnvironments({ adminPermissions: 0n, projectPermissions }),
    rw: ProjectAuthorized.ManageEnvironments({ adminPermissions: 0n, projectPermissions }),
  }
}

export function generateGrafanaGroupPath(keycloakRootGroupPath: string, subGroupName: GrafanaSubGroupName): string {
  const normalizedRoot = keycloakRootGroupPath.endsWith('/')
    ? keycloakRootGroupPath.slice(0, -1)
    : keycloakRootGroupPath
  return `${normalizedRoot}/${GRAFANA_GROUP_NAME}/${subGroupName}`
}

export function generateGrafanaProdRbacGroupPaths(keycloakRootGroupPath: string): [string, string] {
  return [
    generateGrafanaGroupPath(keycloakRootGroupPath, GRAFANA_SUBGROUP_PROD_RW),
    generateGrafanaGroupPath(keycloakRootGroupPath, GRAFANA_SUBGROUP_PROD_RO),
  ]
}

export function generateGrafanaHprodRbacGroupPaths(keycloakRootGroupPath: string): [string, string] {
  return [
    generateGrafanaGroupPath(keycloakRootGroupPath, GRAFANA_SUBGROUP_HPROD_RW),
    generateGrafanaGroupPath(keycloakRootGroupPath, GRAFANA_SUBGROUP_HPROD_RO),
  ]
}

export function generateTenantId(env: EnvType, projectId: string): `${EnvType}-${string}` {
  return `${env}-${compressUUID(projectId)}`
}

export function generateObservabilityProject(
  project: ProjectWithDetails,
  options: {
    repositoryUrl: string
    tenantRbacProd: [string, string]
    tenantRbacHProd: [string, string]
  },
): ObservabilityProject {
  const projectValue: ObservabilityProject = {
    projectName: project.slug,
    projectRepository: {
      url: options.repositoryUrl,
      path: '.',
    },
    envs: {
      hprod: {
        groups: options.tenantRbacHProd,
        tenants: {},
      },
      prod: {
        groups: options.tenantRbacProd,
        tenants: {},
      },
    },
  }

  for (const environment of project.environments) {
    const env: EnvType = isProdStage(environment.stage) ? PROD_ENV : HPROD_ENV
    const envConfig = projectValue.envs[env]
    if (envConfig) {
      envConfig.tenants[generateTenantId(env, project.id)] = {}
    }
  }

  if (projectValue.envs.hprod && !Object.keys(projectValue.envs.hprod.tenants).length) {
    delete projectValue.envs.hprod
  }
  if (projectValue.envs.prod && !Object.keys(projectValue.envs.prod?.tenants ?? {}).length) {
    delete projectValue.envs.prod
  }

  return projectValue
}

export function generateKeycloakRootGroupPath(project: { slug: string }): string {
  return `/${project.slug}`
}

export function grafanaRbacSubGroupNames(): GrafanaSubGroupName[] {
  return [
    GRAFANA_SUBGROUP_HPROD_RW,
    GRAFANA_SUBGROUP_HPROD_RO,
    GRAFANA_SUBGROUP_PROD_RW,
    GRAFANA_SUBGROUP_PROD_RO,
  ]
}

export function grafanaRbacMembershipMappings(listPerms: ListPerms): Array<{ subgroup: GrafanaSubGroupName, desired: string[] }> {
  return [
    { subgroup: GRAFANA_SUBGROUP_HPROD_RW, desired: listPerms['hors-prod'].edit },
    { subgroup: GRAFANA_SUBGROUP_HPROD_RO, desired: listPerms['hors-prod'].view },
    { subgroup: GRAFANA_SUBGROUP_PROD_RW, desired: listPerms.prod.edit },
    { subgroup: GRAFANA_SUBGROUP_PROD_RO, desired: listPerms.prod.view },
  ]
}

const observabilityChartSchema = z.object({
  apiVersion: z.string(),
  name: z.string(),
  type: z.string(),
  version: z.string(),
  appVersion: z.string(),
  dependencies: z.array(z.object({
    name: z.string(),
    version: z.string(),
    repository: urlSchema,
  })),
})

export function observabilityChartContent(chartVersion: string): string {
  const chart = observabilityChartSchema.parse({
    apiVersion: 'v2',
    name: 'dso-observability',
    type: 'application',
    version: '0.1.0',
    appVersion: '0.0.1',
    dependencies: [
      {
        name: 'dso-observability',
        version: chartVersion,
        repository: 'https://cloud-pi-native.github.io/helm-charts/',
      },
    ],
  })
  return stringify(chart)
}

export function isPluginDisabled(project: ProjectWithDetails): boolean {
  return specificallyDisabled(
    project.plugins?.find(p => p.pluginName === PLUGIN_NAME && p.key === ENABLED_PLUGIN_KEY)?.value,
  ) === true
}

export const observabilityTemplateContent = `
{{- include "grafana-dashboards.dashboards" . -}}
{{- include "grafana-dashboards.rules" . -}}
`
