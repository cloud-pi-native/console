import type { AdminRole, Project, ProjectMember, StepCall, UserEmail, ZoneObject } from '@cpn-console/hooks'
import type { ProjectRole } from '@cpn-console/shared'
import { generateRandomPassword, PluginResultBuilder } from '@cpn-console/hooks'
import {
  findClientByClientId,
  findUserByEmail,
  KeycloakGroupPath,
  KeycloakOidcClient,
  KeycloakUserGroupMembership,
  listAllSubgroupsByParentId,
  listGroupMembers,
  listUserGroups,
  lookupGroupByPathOrName,
  runMiracleScope,
  secret,
} from '@cpn-console/miracle'
import { consoleGroupName } from './group.js'
import { logger } from './logger.js'

export const retrieveKeycloakUserByEmail: StepCall<UserEmail> = async ({ args: { email } }) => {
  try {
    const user = await findUserByEmail(email)
    logger.debug({ action: 'retrieveKeycloakUserByEmail', found: Boolean(user) }, 'Hook done')

    return {
      status: { result: 'OK' },
      user,
    }
  } catch (error) {
    logger.error({ action: 'retrieveKeycloakUserByEmail', err: error }, 'Hook failed')
    return {
      error,
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const deleteProject: StepCall<Project> = async ({ args: project }) => {
  const projectSlug = project.slug
  try {
    await runMiracleScope(`keycloak-plugin:deleteProject:${projectSlug}`, async () => {
      await KeycloakGroupPath(`project:${projectSlug}`, { path: projectSlug, present: false })
    })
    logger.info({ action: 'deleteProject', projectSlug, outcome: 'deleted' }, 'Hook done')
    return { status: { result: 'OK', message: 'Deleted' } }
  } catch (error) {
    logger.error({ action: 'deleteProject', projectSlug, err: error }, 'Hook failed')
    return {
      error,
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const upsertProject: StepCall<Project> = async ({ args: project }) => {
  const projectSlug = project.slug
  const pluginResult = new PluginResultBuilder('Up-to-date')
  return runMiracleScope(`keycloak-plugin:upsertProject:${projectSlug}`, async () => {
    try {
      const projectGroup = await KeycloakGroupPath(`project:${projectSlug}`, { path: projectSlug })
      const groupMembers = await listGroupMembers(projectGroup.id)

      await Promise.all([
        ...groupMembers.map((member: any, index: number) => {
          if (!member?.id) return undefined
          if (!project.users.some(({ id }) => id === member.id)) {
            return KeycloakUserGroupMembership(`project-member:rm:${member.id}:${projectGroup.id}`, {
              userId: member.id,
              groupId: projectGroup.id,
              present: false,
            }).catch((err: unknown) => {
              pluginResult.addKoMessage('Can\'t remove user from keycloak project group')
              pluginResult.addExtra(`remove-${index}`, err)
            })
          }
          return undefined
        }),
        ...project.users.map((user, index) => {
          if (!groupMembers.some((m: any) => m?.id === user.id)) {
            return KeycloakUserGroupMembership(`project-member:add:${user.id}:${projectGroup.id}`, {
              userId: user.id,
              groupId: projectGroup.id,
              present: true,
            }).catch((err: unknown) => {
              pluginResult.addKoMessage('Can\'t add user to keycloak project group')
              pluginResult.addExtra(`add-${index}`, err)
            })
          }
          return undefined
        }),
      ])

      const consoleGroupPath = `/${projectSlug}/${consoleGroupName}`
      const consoleGroup = await KeycloakGroupPath(`console:${consoleGroupPath}`, { path: consoleGroupPath })

      const existingSubgroups = await listAllSubgroupsByParentId(consoleGroup.id)
      const existingEnvGroups = existingSubgroups.filter((g: any) => {
        if (!g?.path || typeof g.path !== 'string') return false
        return g.path.split('/').filter(Boolean).length === 3 && g.path.startsWith(`${consoleGroupPath}/`)
      })

      const promises: Promise<unknown>[] = []
      for (const environment of project.environments) {
        const envGroupPath = `${consoleGroupPath}/${environment.name}`
        const roGroupPath = `${envGroupPath}/RO`
        const rwGroupPath = `${envGroupPath}/RW`

        const [envGroup, roGroup, rwGroup] = await Promise.all([
          KeycloakGroupPath(`env:${envGroupPath}`, { path: envGroupPath }),
          KeycloakGroupPath(`env-ro:${roGroupPath}`, { path: roGroupPath }),
          KeycloakGroupPath(`env-rw:${rwGroupPath}`, { path: rwGroupPath }),
        ])

        for (const permission of environment.permissions) {
          promises.push(KeycloakUserGroupMembership(`env-ro:${permission.userId}:${roGroup.id}`, {
            userId: permission.userId,
            groupId: roGroup.id,
            present: permission.permissions.ro,
          }))
          promises.push(KeycloakUserGroupMembership(`env-rw:${permission.userId}:${rwGroup.id}`, {
            userId: permission.userId,
            groupId: rwGroup.id,
            present: permission.permissions.rw,
          }))
        }

        void envGroup
      }

      await Promise.all(promises)

      const envNames = new Set(project.environments.map(e => e.name))
      await Promise.all(existingEnvGroups.map((g: any) => {
        if (!g?.name || !g?.path) return undefined
        if (envNames.has(g.name)) return undefined
        return KeycloakGroupPath(`env:delete:${g.path}`, { path: g.path, present: false })
      }))

      logger.info({ action: 'upsertProject', projectSlug }, 'Hook done')
      return pluginResult.getResultObject()
    } catch (error) {
      logger.error({ action: 'upsertProject', projectSlug, err: error }, 'Hook failed')
      return pluginResult.returnUnexpectedError(error)
    }
  })
}

export const upsertZone: StepCall<ZoneObject> = async ({ args: zone, apis }) => {
  const zoneSlug = zone.slug
  return runMiracleScope(`keycloak-plugin:upsertZone:${zoneSlug}`, async () => {
    try {
      const argocdUrl = zone.argocdUrl
      const clientId = getClientZoneId(zone)
      const client = {
        clientId,
        clientAuthenticatorType: 'client-secret',
        protocol: 'openid-connect',
        publicClient: false,
        defaultClientScopes: ['generic'],
        redirectUris: [`${argocdUrl}/auth/callback`],
        webOrigins: [argocdUrl],
        rootUrl: argocdUrl,
        adminUrl: argocdUrl,
        baseUrl: '/applications',
      }

      const existingClient = await findClientByClientId(clientId)
      let outcome: 'updated' | 'created'
      if (existingClient?.id) {
        await KeycloakOidcClient(`zone-client:${clientId}`, client)
        outcome = 'updated'
      } else {
        const password = generateRandomPassword(30)
        await apis.vault.write({ clientSecret: password }, 'keycloak')
        await KeycloakOidcClient(`zone-client:${clientId}`, { ...client, secret: secret(password, `keycloak-zone-client:${clientId}`) })
        outcome = 'created'
      }

      logger.info({ action: 'upsertZone', zoneSlug, clientId, outcome }, 'Hook done')
      return { status: { result: 'OK', message: 'Up-to-date' } }
    } catch (error) {
      logger.error({ action: 'upsertZone', zoneSlug, err: error }, 'Hook failed')
      return { error, status: { result: 'KO', message: 'Failed' } }
    }
  })
}

export const deleteZone: StepCall<ZoneObject> = async ({ args: zone }) => {
  const zoneSlug = zone.slug
  return runMiracleScope(`keycloak-plugin:deleteZone:${zoneSlug}`, async () => {
    try {
      const clientId = getClientZoneId(zone)
      await KeycloakOidcClient(`zone-client:${clientId}`, { clientId, present: false })
      logger.info({ action: 'deleteZone', zoneSlug, clientId, outcome: 'deleted' }, 'Hook done')
      return { status: { result: 'OK', message: 'Deleted' } }
    } catch (error) {
      logger.error({ action: 'deleteZone', zoneSlug, clientId: getClientZoneId(zone), err: error }, 'Hook failed')
      return { error, status: { result: 'KO', message: 'An unexpected error occured' } }
    }
  })
}

export const upsertAdminRole: StepCall<AdminRole> = async ({ args: role }) => {
  if (!role.oidcGroup) return { status: { result: 'OK', message: 'No OIDC Group defined' } }
  const pluginResult = new PluginResultBuilder('Up-to-date')
  return runMiracleScope(`keycloak-plugin:upsertAdminRole:${role.id}`, async () => {
    try {
      const group = await KeycloakGroupPath(`admin-role:${role.oidcGroup}`, { path: role.oidcGroup })
      const groupMembers = await listGroupMembers(group.id)

      await Promise.all([
        ...groupMembers.map((member: any, index: number) => {
          if (member?.id && !role.members.some(({ id }) => id === member.id)) {
            return KeycloakUserGroupMembership(`admin:rm:${member.id}:${group.id}`, {
              userId: member.id,
              groupId: group.id,
              present: false,
            }).catch((err: unknown) => {
              pluginResult.addKoMessage('Can\'t remove user from keycloak admin group')
              pluginResult.addExtra(`remove-${index}`, err)
            })
          }
          return undefined
        }),
        ...role.members.map((user, index) => {
          if (!groupMembers.some((m: any) => m?.id === user.id)) {
            return KeycloakUserGroupMembership(`admin:add:${user.id}:${group.id}`, {
              userId: user.id,
              groupId: group.id,
              present: true,
            }).catch((err: unknown) => {
              pluginResult.addKoMessage('Can\'t add user to keycloak admin group')
              pluginResult.addExtra(`add-${index}`, err)
            })
          }
          return undefined
        }),
      ])

      logger.info({ action: 'upsertAdminRole', roleId: role.id, oidcGroup: role.oidcGroup }, 'Hook done')
      return pluginResult.getResultObject()
    } catch (error) {
      logger.error({ action: 'upsertAdminRole', roleId: role.id, oidcGroup: role.oidcGroup, err: error }, 'Hook failed')
      return pluginResult.returnUnexpectedError(error)
    }
  })
}

export const deleteAdminRole: StepCall<AdminRole> = async ({ args: role }) => {
  if (!role.oidcGroup) return { status: { result: 'OK', message: 'No OIDC Group defined' } }
  const pluginResult = new PluginResultBuilder('Deleted')
  return runMiracleScope(`keycloak-plugin:deleteAdminRole:${role.id}`, async () => {
    try {
      const group = await lookupGroupByPathOrName(role.oidcGroup)

      if (group?.id) {
        const groupId: string = group.id
        await Promise.all(role.members.map((user, index) => {
          return KeycloakUserGroupMembership(`admin:rm:${user.id}:${groupId}`, {
            userId: user.id,
            groupId,
            present: false,
          }).catch((err: unknown) => {
            pluginResult.addKoMessage('Can\'t remove user from keycloak admin group')
            pluginResult.addExtra(`remove-${index}`, err)
          })
        }))
      }

      logger.info({ action: 'deleteAdminRole', roleId: role.id, oidcGroup: role.oidcGroup }, 'Hook done')
      return pluginResult.getResultObject()
    } catch (error) {
      logger.error({ action: 'deleteAdminRole', roleId: role.id, oidcGroup: role.oidcGroup, err: error }, 'Hook failed')
      return pluginResult.returnUnexpectedError(error)
    }
  })
}

export const upsertProjectRole: StepCall<ProjectRole> = async ({ args: role }) => {
  if (!role.oidcGroup) {
    return {
      status: {
        result: 'OK',
        message: 'No OIDC group defined',
      },
    }
  }
  const oidcGroup = role.oidcGroup
  return runMiracleScope(`keycloak-plugin:upsertProjectRole:${role.id}`, async () => {
    try {
      await KeycloakGroupPath(`project-role:${oidcGroup}`, { path: oidcGroup })
      logger.info({ action: 'upsertProjectRole', roleId: role.id, oidcGroup }, 'Hook done')
      return { status: { result: 'OK', message: 'Synced' } }
    } catch (error) {
      logger.error({ action: 'upsertProjectRole', roleId: role.id, oidcGroup, err: error }, 'Hook failed')
      return { error, status: { result: 'KO', message: 'Failed to sync role' } }
    }
  })
}

export const deleteProjectRole: StepCall<ProjectRole> = async ({ args: role }) => {
  if (!role.oidcGroup) {
    return {
      status: {
        result: 'OK',
        message: 'No OIDC group defined',
      },
    }
  }
  const oidcGroup = role.oidcGroup
  return runMiracleScope(`keycloak-plugin:deleteProjectRole:${role.id}`, async () => {
    try {
      await KeycloakGroupPath(`project-role:${oidcGroup}`, { path: oidcGroup, present: false })
      logger.info({ action: 'deleteProjectRole', roleId: role.id, oidcGroup, outcome: 'deleted' }, 'Hook done')
      return { status: { result: 'OK', message: 'Deleted' } }
    } catch (error) {
      logger.error({ action: 'deleteProjectRole', roleId: role.id, oidcGroup, err: error }, 'Hook failed')
      return { error, status: { result: 'KO', message: 'Failed to delete role' } }
    }
  })
}

export const upsertProjectMember: StepCall<ProjectMember> = async ({ args: member }) => {
  const pluginResult = new PluginResultBuilder('Synced')
  return runMiracleScope(`keycloak-plugin:upsertProjectMember:${member.project.slug}:${member.userId}`, async () => {
    try {
      const consoleGroupPath = `/${member.project.slug}/${consoleGroupName}`
      const consoleGroup = await KeycloakGroupPath(`console:${consoleGroupPath}`, { path: consoleGroupPath })

      const allRoleGroups = await listAllSubgroupsByParentId(consoleGroup.id)
      const userGroups = await listUserGroups(member.userId)

      const userRolesOidcGroups = member.roles
        .map(r => r.oidcGroup)
        .filter((g): g is string => !!g)

      let groupMembershipChanges = 0
      for (const roleGroup of allRoleGroups) {
        if (!roleGroup?.id || !roleGroup?.path) continue
        const isMember = userGroups.some((ug: any) => ug?.id === roleGroup.id)
        const shouldBeMember = userRolesOidcGroups.includes(roleGroup.path)

        if (shouldBeMember && !isMember) {
          groupMembershipChanges += 1
          await KeycloakUserGroupMembership(`project-role:add:${member.userId}:${roleGroup.id}`, {
            userId: member.userId,
            groupId: roleGroup.id,
            present: true,
          })
        } else if (!shouldBeMember && isMember) {
          groupMembershipChanges += 1
          await KeycloakUserGroupMembership(`project-role:rm:${member.userId}:${roleGroup.id}`, {
            userId: member.userId,
            groupId: roleGroup.id,
            present: false,
          })
        }
      }

      logger.info({ action: 'upsertProjectMember', projectSlug: member.project.slug, groupMembershipChanges }, 'Hook done')
      return pluginResult.getResultObject()
    } catch (error) {
      logger.error({ action: 'upsertProjectMember', projectSlug: member.project.slug, err: error }, 'Hook failed')
      return pluginResult.returnUnexpectedError(error)
    }
  })
}

export const deleteProjectMember: StepCall<ProjectMember> = async ({ args: member }) => {
  const pluginResult = new PluginResultBuilder('Deleted')
  return runMiracleScope(`keycloak-plugin:deleteProjectMember:${member.project.slug}:${member.userId}`, async () => {
    try {
      if (!member.userId) return pluginResult.getResultObject()

      const projectGroupPath = `/${member.project.slug}`
      const projectGroup = await lookupGroupByPathOrName(projectGroupPath) ?? await lookupGroupByPathOrName(member.project.slug)
      if (!projectGroup?.id || !projectGroup?.path) return pluginResult.getResultObject()

      const userGroups = await listUserGroups(member.userId)
      const projectGroups = userGroups.filter((g: any) => typeof g?.path === 'string' && g.path.startsWith(projectGroup.path))

      let removedCount = 0
      for (const group of projectGroups) {
        if (group?.id) {
          await KeycloakUserGroupMembership(`project:rm:${member.userId}:${group.id}`, {
            userId: member.userId,
            groupId: group.id,
            present: false,
          })
          removedCount += 1
        }
      }

      logger.info({ action: 'deleteProjectMember', projectSlug: member.project.slug, removedCount }, 'Hook done')
      return pluginResult.getResultObject()
    } catch (error) {
      logger.error({ action: 'deleteProjectMember', projectSlug: member.project.slug, err: error }, 'Hook failed')
      return pluginResult.returnUnexpectedError(error)
    }
  })
}

function getClientZoneId(zone: ZoneObject): string {
  return `argocd-${zone.slug}-zone`
}
