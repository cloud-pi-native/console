/**
 * [FR] ATTENTION ! Ce fichier est la base du système de permissions de l'application.
 * Ces permissions sont basés sur le Bitwise Permissions System. Les modifier à posteriori pourrait être catastrophique niveau sécurité.
 * Veuillez bien étudier le système et lire la documentation.
 *
 * [EN] This file is the basis of the application's permissions system.
 * These permissions are based on the Bitwise Permissions System. Modifying them after the fact could be catastrophic in terms of security.
 * Please study the system carefully and read the documentation.
 * https://en.wikipedia.org/wiki/Bitwise_operation
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND
 * https://www.alexhyett.com/bitwise-operators/
 *
 * Voici des sources d'inspirations
 * https://discordapi.com/permissions.html#32
 * https://discord.com/developers/docs/topics/permissions#permissions
 */
import { z } from 'zod'
import { ResourceById } from './types.js'

export const getPermsByUserRoles = (
  userRoles: string[],
  rolesById: ResourceById<{ id: string, permissions: bigint | string }>,
  basePerms?: bigint | string,
) => userRoles.reduce((acc, curr) => {
  if (!rolesById[curr]) {
    console.trace(`Unable to find role: ${curr}, database needs to be inspected`)
  }
  return acc | BigInt(rolesById[curr].permissions)
}, basePerms ? BigInt(basePerms) : 0n)

function permissionsParser(a: Record<string, bigint>) {
  const valuesRegistered = [] as bigint[]
  for (const [k, v] of Object.entries(a)) {
    if (typeof v !== 'bigint') throw Error(`${k} has a invalid value: ${v}, which is not a bigint`)
    if (valuesRegistered.includes(v)) throw Error(`${k} has a duplicated value: ${v}`)
    valuesRegistered.push(v)
  }
}

export const permissionLevelSchema = z.coerce.string()

const bit = (position: bigint) => 1n << position

// Be very careful and think to apply corresponding updates in database if you modify these values, You'll have to do binary updates in SQL, good luck !
export const PROJECT_PERMS = { // project permissions
  // GUEST: bit(0n),
  MANAGE: bit(1n),
  MANAGE_MEMBERS: bit(2n),
  MANAGE_ENVIRONMENTS: bit(3n),
  MANAGE_REPOSITORIES: bit(4n),
  MANAGE_ROLES: bit(5n),
  SEE_SECRETS: bit(6n),
  REPLAY_HOOKS: bit(7n),
  LIST_ENVIRONMENTS: bit(8n),
  LIST_REPOSITORIES: bit(9n),
}

// Be very careful and think to apply corresponding updates in database if you modify these values, You'll have to do binary updates in SQL, good luck !
export const ADMIN_PERMS = { // admin permissions
  // GUEST: bit(0n),
  MANAGE: bit(1n),
  MANAGE_CLUSTERS: bit(2n),
  MANAGE_ORGANIZATIONS: bit(3n),
  MANAGE_PLUGINS: bit(4n),
  MANAGE_PROJECTS: bit(5n),
  MANAGE_QUOTAS: bit(6n),
  MANAGE_ROLES: bit(7n),
  MANAGE_STAGES: bit(8n),
  MANAGE_ZONES: bit(9n),
  VIEW_LOGS: bit(10n),
  LIST_PROJECTS: bit(11n),
  LIST_ALL_QUOTAS: bit(12n),
}

export type AdminPermsKeys = keyof typeof ADMIN_PERMS

permissionsParser(ADMIN_PERMS)
permissionsParser(PROJECT_PERMS)

type ProjectAuthorizedParams = { adminPermissions?: bigint | string, projectPermissions?: bigint | string }

export const ProjectAuthorized = {
  Manage: (perms: ProjectAuthorizedParams) => AdminAuthorized.ManageProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & PROJECT_PERMS.MANAGE),

  ListEnvironments: (perms: ProjectAuthorizedParams) => AdminAuthorized.ListProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.LIST_ENVIRONMENTS | PROJECT_PERMS.MANAGE_ENVIRONMENTS | PROJECT_PERMS.MANAGE)),
  ListRepositories: (perms: ProjectAuthorizedParams) => AdminAuthorized.ListProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.LIST_REPOSITORIES | PROJECT_PERMS.MANAGE_REPOSITORIES | PROJECT_PERMS.MANAGE)),

  ManageEnvironments: (perms: ProjectAuthorizedParams) => AdminAuthorized.ManageProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.MANAGE_ENVIRONMENTS | PROJECT_PERMS.MANAGE)),
  ManageRepositories: (perms: ProjectAuthorizedParams) => AdminAuthorized.ManageProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.MANAGE_REPOSITORIES | PROJECT_PERMS.MANAGE)),

  ManageMembers: (perms: ProjectAuthorizedParams) => AdminAuthorized.ManageProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.MANAGE_MEMBERS | PROJECT_PERMS.MANAGE)),

  ManageRoles: (perms: ProjectAuthorizedParams) => AdminAuthorized.ManageProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.MANAGE_ROLES | PROJECT_PERMS.MANAGE)),

  ReplayHooks: (perms: ProjectAuthorizedParams) => AdminAuthorized.ManageProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.REPLAY_HOOKS | PROJECT_PERMS.MANAGE)),

  SeeSecrets: (perms: ProjectAuthorizedParams) => AdminAuthorized.ManageProjects(perms.adminPermissions)
  || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.SEE_SECRETS | PROJECT_PERMS.MANAGE)),
} as const

export const AdminAuthorized = {
  ListProjects: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.LIST_PROJECTS | ADMIN_PERMS.MANAGE_PROJECTS | ADMIN_PERMS.MANAGE | ADMIN_PERMS.MANAGE_CLUSTERS)),
  Manage: (perms?: bigint | string) => !!(toBigInt(perms) & ADMIN_PERMS.MANAGE),
  ManageClusters: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.MANAGE_CLUSTERS | ADMIN_PERMS.MANAGE)),
  ManageOrganizations: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.MANAGE_ORGANIZATIONS | ADMIN_PERMS.MANAGE)),
  ManagePlugins: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.MANAGE_PLUGINS | ADMIN_PERMS.MANAGE)),
  ManageProjects: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.MANAGE_PROJECTS | ADMIN_PERMS.MANAGE)),
  ManageQuotas: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.MANAGE_QUOTAS | ADMIN_PERMS.MANAGE)),
  ManageRoles: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.MANAGE_ROLES | ADMIN_PERMS.MANAGE)),
  ManageStages: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.MANAGE_STAGES | ADMIN_PERMS.MANAGE)),
  ManageZones: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.MANAGE_ZONES | ADMIN_PERMS.MANAGE)),
  ViewLogs: (perms?: bigint | string) => !!(toBigInt(perms) & (ADMIN_PERMS.VIEW_LOGS | ADMIN_PERMS.MANAGE)),
} as const

export const toBigInt = (value?: bigint | number | string | undefined) => value ? BigInt(value) : 0n

export const projectPermsLabels: Record<keyof typeof PROJECT_PERMS, string> = {
  LIST_ENVIRONMENTS: 'Voir les environnements',
  MANAGE: 'Gérer le projet',
  MANAGE_ENVIRONMENTS: 'Gérer les environnements',
  MANAGE_MEMBERS: 'Gérer les membres du projet',
  LIST_REPOSITORIES: 'Voir les dépôts',
  MANAGE_REPOSITORIES: 'Gérer les dépots',
  MANAGE_ROLES: 'Gérer les rôles du projet',
  REPLAY_HOOKS: 'Reprovisionner le projet',
  SEE_SECRETS: 'Afficher les secrets',
}

export const adminPermsLabels: Record<AdminPermsKeys, string> = {
  MANAGE: 'Administration globale',
  LIST_PROJECTS: 'Lister tous les projets',
  MANAGE_CLUSTERS: 'Gérer les clusters',
  MANAGE_ORGANIZATIONS: 'Gérer les organisations',
  MANAGE_PLUGINS: 'Gérer la configuration des plugins',
  MANAGE_ROLES: 'Gérer les rôles d\'administration',
  MANAGE_PROJECTS: 'Gérer tous les projets',
  MANAGE_QUOTAS: 'Gérer les quotas et utiliser les quotas privés',
  MANAGE_STAGES: 'Gérer les types d\'environment',
  MANAGE_ZONES: 'Gérer les zones',
  VIEW_LOGS: 'Visualiser les logs',
  LIST_ALL_QUOTAS: 'Lister les quotas privés',
}

export const projectPermsOrder: Array<keyof typeof PROJECT_PERMS> = [
  'MANAGE',
  'MANAGE_MEMBERS',
  'MANAGE_ROLES',
  'LIST_ENVIRONMENTS',
  'MANAGE_ENVIRONMENTS',
  'LIST_REPOSITORIES',
  'MANAGE_REPOSITORIES',
  'SEE_SECRETS',
  'REPLAY_HOOKS',
]

export const adminPermsOrder: Array<AdminPermsKeys> = [
  'MANAGE',
  'LIST_PROJECTS',
  'MANAGE_PROJECTS',
  'VIEW_LOGS',
  'MANAGE_ROLES',
  'MANAGE_ORGANIZATIONS',
  'MANAGE_ZONES',
  'MANAGE_CLUSTERS',
  'MANAGE_PLUGINS',
  'MANAGE_QUOTAS',
  'MANAGE_STAGES',
  'LIST_ALL_QUOTAS',
]
