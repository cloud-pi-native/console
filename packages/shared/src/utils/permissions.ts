import type { ResourceById } from './types.js'
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

export function getPermsByUserRoles(userRoles: string[], rolesById: ResourceById<{ id: string, permissions: bigint | string }>, basePerms?: bigint | string) {
  return userRoles.reduce((acc, curr) => {
    if (!rolesById[curr]) {
      console.trace(`Unable to find role: ${curr}, database needs to be inspected`)
    }
    return acc | BigInt(rolesById[curr].permissions)
  }, basePerms ? BigInt(basePerms) : 0n)
}

function permissionsParser(a: Record<string, bigint>) {
  const valuesRegistered = [] as bigint[]
  for (const [k, v] of Object.entries(a)) {
    if (typeof v !== 'bigint')
      throw new Error(`${k} has a invalid value: ${v}, which is not a bigint`)
    if (valuesRegistered.includes(v))
      throw new Error(`${k} has a duplicated value: ${v}`)
    valuesRegistered.push(v)
  }
}

export const permissionLevelSchema = z.coerce.string()

const bit = (position: bigint) => 1n << position

// Be very careful and think to apply corresponding updates in database if you modify these values, You'll have to do binary updates in SQL, good luck !
export const PROJECT_PERMS = { // project permissions
  GUEST: bit(0n),
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
  MANAGE: bit(1n),
}

export type ProjectPermsKeys = keyof typeof PROJECT_PERMS
export type AdminPermsKeys = keyof typeof ADMIN_PERMS

permissionsParser(ADMIN_PERMS)
permissionsParser(PROJECT_PERMS)

interface ProjectAuthorizedParams { adminPermissions?: bigint | string, projectPermissions?: bigint | string }

export const toBigInt = (value?: bigint | number | string | undefined) => value ? BigInt(value) : 0n

export const AdminAuthorized = {
  isAdmin: (perms?: bigint | string) => !!(toBigInt(perms) & ADMIN_PERMS.MANAGE),
} as const

export const ProjectAuthorized = {
  Manage: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & PROJECT_PERMS.MANAGE),

  ListEnvironments: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.LIST_ENVIRONMENTS | PROJECT_PERMS.MANAGE_ENVIRONMENTS | PROJECT_PERMS.MANAGE)),
  ListRepositories: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.LIST_REPOSITORIES | PROJECT_PERMS.MANAGE_REPOSITORIES | PROJECT_PERMS.MANAGE)),

  ManageEnvironments: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.MANAGE_ENVIRONMENTS | PROJECT_PERMS.MANAGE)),
  ManageRepositories: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.MANAGE_REPOSITORIES | PROJECT_PERMS.MANAGE)),

  ManageMembers: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.MANAGE_MEMBERS | PROJECT_PERMS.MANAGE)),

  ManageRoles: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.MANAGE_ROLES | PROJECT_PERMS.MANAGE)),

  ReplayHooks: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.REPLAY_HOOKS | PROJECT_PERMS.MANAGE)),

  SeeSecrets: (perms: ProjectAuthorizedParams) => AdminAuthorized.isAdmin(perms.adminPermissions)
    || !!(toBigInt(perms.projectPermissions) & (PROJECT_PERMS.SEE_SECRETS | PROJECT_PERMS.MANAGE)),
} as const

interface ScopePerm<T extends string> {
  name: string
  perms: Array<{ key: T, label: string, hint?: string }>
}
type PermDetails<T extends string> = Array<ScopePerm<T>>

export const projectPermsDetails: PermDetails<ProjectPermsKeys> = [{
  name: 'Projet',
  perms: [{
    key: 'MANAGE',
    label: 'Gérer le projet',
    hint: 'Permet de gérer tout le projet et ses ressources associées',
  }, {
    key: 'MANAGE_ROLES',
    label: 'Gérer les rôles du projet',
    hint: 'ATTENTION : Ce rôle inclut une élévation de privilège ! Permet de gérer les rôles du projet et les membres associés',
  }, {
    key: 'MANAGE_MEMBERS',
    label: 'Gérer les membres du projet',
    hint: 'Permet d\'inviter des utilisateurs et de les retirer',
  }, {
    key: 'SEE_SECRETS',
    label: 'Afficher les secrets',
    hint: 'Permet d\'afficher les secrets générés par les services',
  }, {
    key: 'REPLAY_HOOKS',
    label: 'Reprovisionner le projet',
    hint: 'Permet de lancer un reprovisionnage du projet',
  }],
}, {
  name: 'Environement',
  perms: [
    {
      key: 'MANAGE_ENVIRONMENTS',
      label: 'Gérer les environnements',
      hint: 'Permet de créer, éditer, supprimer des environnements',
    },
    {
      key: 'LIST_ENVIRONMENTS',
      label: 'Voir les environnements',
      hint: 'Permet de visualiser tous les environnements et leurs configurations',
    },
  ],
}, {
  name: 'Dépôt',
  perms: [
    {
      key: 'MANAGE_REPOSITORIES',
      label: 'Gérer les dépots',
      hint: 'Permet de créer, éditer, supprimer des dépôts',
    },
    {
      key: 'LIST_REPOSITORIES',
      label: 'Voir les dépôts',
      hint: 'Permet de visualiser tous les dépôts et leurs configurations',
    },
  ],
}] as const

export const adminPermsDetails: PermDetails<AdminPermsKeys> = [{
  name: 'Global',
  perms: [{
    key: 'MANAGE',
    label: 'Administration globale',
    hint: 'Administration globale de toute la console et de ses ressources',
  }],
}] as const

export function getAdminPermLabelsByValue(value: bigint | string) {
  value = typeof value === 'bigint' ? value : BigInt(value)
  return adminPermsDetails
    .map(section => section.perms)
    .flat()
    .filter(permDetail => ADMIN_PERMS[permDetail.key] & value)
    .map(permDetail => permDetail.label)
}

export function getProjectPermLabelsByValue(value: bigint | string) {
  value = typeof value === 'bigint' ? value : BigInt(value)
  return projectPermsDetails
    .map(section => section.perms)
    .flat()
    .filter(permDetail => PROJECT_PERMS[permDetail.key] & value)
    .map(permDetail => permDetail.label)
}
