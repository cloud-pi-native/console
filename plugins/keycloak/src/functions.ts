import type { AdminRole, Project, ProjectMember, StepCall, UserEmail, ZoneObject } from '@cpn-console/hooks'
import type { ProjectRole } from '@cpn-console/shared'
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'
import type { CustomGroup } from './group.js'
import { generateRandomPassword, PluginResultBuilder } from '@cpn-console/hooks'
import { getkcClient } from './client.js'
import { consoleGroupName, deleteGroup, getAllSubgroups, getGroupByName, getOrCreateChildGroup, getOrCreateGroupByPath, getOrCreateProjectGroup } from './group.js'
import { logger } from './logger.js'

export const retrieveKeycloakUserByEmail: StepCall<UserEmail> = async ({ args: { email } }) => {
  const kcClient = await getkcClient()
  try {
    const user = (await kcClient.users.find({ email }))[0]
    logger.debug({ action: 'retrieveKeycloakUserByEmail', found: Boolean(user) }, 'Keycloak hook done')

    return {
      status: { result: 'OK' },
      user,
    }
  } catch (error) {
    logger.error({ action: 'retrieveKeycloakUserByEmail', err: error }, 'Keycloak hook failed')
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
    const kcClient = await getkcClient()
    const group = await getGroupByName(kcClient, projectSlug)
    if (group?.id) {
      await kcClient.groups.del({ id: group.id })
      logger.info({ action: 'deleteProject', projectSlug, outcome: 'deleted' }, 'Keycloak hook done')
      return {
        status: {
          result: 'OK',
          message: 'Deleted',
        },
      }
    }
    logger.info({ action: 'deleteProject', projectSlug, outcome: 'already-missing' }, 'Keycloak hook done')
    return {
      status: {
        result: 'OK',
        message: 'Already Missing',
      },
    }
  } catch (error) {
    logger.error({ action: 'deleteProject', projectSlug, err: error }, 'Keycloak hook failed')
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
  try {
    const kcClient = await getkcClient()
    const projectGroup = await getOrCreateProjectGroup(kcClient, projectSlug)

    const groupMembers = await kcClient.groups.listMembers({ id: projectGroup.id })

    await Promise.all([
      ...groupMembers.map((member) => {
        if (!project.users.some(({ id }) => id === member.id)) {
          return kcClient.users.delFromGroup({
            // @ts-ignore id is present on user, bad typing in lib
            id: member.id,
            groupId: projectGroup.id,
          })
            .catch((err) => {
              pluginResult.addKoMessage(`Can't remove ${member.email} from keycloak project group`)
              pluginResult.addExtra(`remove-${member.id}`, err)
            })
        }
        return undefined
      }),
      ...project.users.map((user) => {
        if (!groupMembers.some(({ id }) => id === user.id)) {
          return kcClient.users.addToGroup({
            id: user.id,
            groupId: projectGroup.id,
          })
            .catch((err) => {
              pluginResult.addKoMessage(`Can't add ${user.email} to keycloak project group`)
              pluginResult.addExtra(`add-${user.id}`, err)
            })
        }
        return undefined
      }),
    ])

    // Ensure envs subgroups exists
    const projectGroups = await getAllSubgroups(kcClient, projectGroup.id, 0)

    const consoleGroup: Required<CustomGroup> = projectGroups.find(({ name }) => name === consoleGroupName) as Required<GroupRepresentation>
      ?? await getOrCreateChildGroup(kcClient, projectGroup.id, consoleGroupName) as Required<GroupRepresentation>

    const envGroups = await getAllSubgroups(kcClient, consoleGroup.id, 0) as CustomGroup[]

    const promises: Promise<any>[] = []
    for (const environment of project.environments) {
      const envGroup: Required<CustomGroup> = envGroups.find(group => group.name === environment.name) as Required<CustomGroup>
        ?? await getOrCreateChildGroup(kcClient, consoleGroup.id, environment.name)

      const [roGroup, rwGroup] = await Promise.all([
        getOrCreateChildGroup(kcClient, envGroup.id, 'RO'),
        getOrCreateChildGroup(kcClient, envGroup.id, 'RW'),
      ])

      // Ensure envs permissions membership exists
      for (const permission of environment.permissions) {
        if (permission.permissions.ro) {
          promises.push(kcClient.users.addToGroup({ id: permission.userId, groupId: roGroup.id }))
        } else {
          promises.push(kcClient.users.delFromGroup({ id: permission.userId, groupId: roGroup.id }))
        }
        if (permission.permissions.rw) {
          promises.push(kcClient.users.addToGroup({ id: permission.userId, groupId: rwGroup.id }))
        } else {
          promises.push(kcClient.users.delFromGroup({ id: permission.userId, groupId: rwGroup.id }))
        }
      }
    }

    await Promise.all(promises)

    const envGroupIdsToDelete = envGroups
      .filter(subGroup => !project.environments.some(({ name }) => name === subGroup.name))
      .map(subGroup => subGroup.id)
      .filter((id): id is string => !!id)
    if (envGroupIdsToDelete.length) {
      await Promise.all(envGroupIdsToDelete.map(id => kcClient.groups.del({ id })))
    }

    logger.info({ action: 'upsertProject', projectSlug }, 'Keycloak hook done')
    return pluginResult.getResultObject()
  } catch (error) {
    logger.error({ action: 'upsertProject', projectSlug, err: error }, 'Keycloak hook failed')
    return pluginResult.returnUnexpectedError(error)
  }
}

export const upsertZone: StepCall<ZoneObject> = async ({ args: zone, apis }) => {
  const zoneSlug = zone.slug
  try {
    const kcClient = await getkcClient()
    const argocdUrl = zone.argocdUrl
    const clientId = getClientZoneId(zone)
    const client: ClientRepresentation = {
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
    const result = await kcClient.clients.find({ clientId, max: 1 })
    let outcome: 'updated' | 'created'
    if (result.length > 0 && result[0].id) {
      await kcClient.clients.update({ id: result[0].id }, client)
      outcome = 'updated'
    } else {
      const password = generateRandomPassword(30)
      await apis.vault.write({ clientSecret: password }, 'keycloak')
      await kcClient.clients.create({
        secret: password,
        ...client,
      })
      outcome = 'created'
    }
    logger.info({ action: 'upsertZone', zoneSlug, clientId, outcome }, 'Keycloak hook done')
    return {
      status: {
        result: 'OK',
        message: 'Up-to-date',
      },
    }
  } catch (error) {
    logger.error({ action: 'upsertZone', zoneSlug, err: error }, 'Keycloak hook failed')
    return {
      error,
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}

export const deleteZone: StepCall<ZoneObject> = async ({ args: zone }) => {
  const zoneSlug = zone.slug
  try {
    const kcClient = await getkcClient()
    const clientId = getClientZoneId(zone)
    const result = await kcClient.clients.find({ clientId, max: 1 })
    if (result.length > 0 && result[0].id) {
      await kcClient.clients.del({ id: result[0].id })
      logger.info({ action: 'deleteZone', zoneSlug, clientId, outcome: 'deleted' }, 'Keycloak hook done')
      return {
        status: {
          result: 'OK',
          message: 'Deleted',
        },
      }
    }
    logger.info({ action: 'deleteZone', zoneSlug, clientId, outcome: 'already-missing' }, 'Keycloak hook done')
    return {
      status: {
        result: 'OK',
        message: 'Already Missing',
      },
    }
  } catch (error) {
    logger.error({ action: 'deleteZone', zoneSlug, clientId: getClientZoneId(zone), err: error }, 'Keycloak hook failed')
    return {
      error,
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}

export const upsertAdminRole: StepCall<AdminRole> = async ({ args: role }) => {
  if (!role.oidcGroup) return { status: { result: 'OK', message: 'No OIDC Group defined' } }
  const pluginResult = new PluginResultBuilder('Up-to-date')
  try {
    const kcClient = await getkcClient()
    const group = await getOrCreateGroupByPath(kcClient, role.oidcGroup)
    const groupMembers = await kcClient.groups.listMembers({ id: group.id })

    await Promise.all([
      ...groupMembers.map((member) => {
        if (member.id && !role.members.some(({ id }) => id === member.id)) {
          return kcClient.users.delFromGroup({
            id: member.id,
            groupId: group!.id!,
          })
            .catch((err) => {
              pluginResult.addKoMessage(`Can't remove ${member.email} from keycloak admin group`)
              pluginResult.addExtra(`remove-${member.id}`, err)
            })
        }
        return undefined
      }),
      ...role.members.map((user) => {
        if (!groupMembers.some(({ id }) => id === user.id)) {
          return kcClient.users.addToGroup({
            id: user.id,
            groupId: group!.id!,
          })
            .catch((err) => {
              pluginResult.addKoMessage(`Can't add ${user.email} to keycloak admin group`)
              pluginResult.addExtra(`add-${user.id}`, err)
            })
        }
        return undefined
      }),
    ])

    logger.info({ action: 'upsertAdminRole', roleId: role.id, oidcGroup: role.oidcGroup }, 'Keycloak hook done')
    return pluginResult.getResultObject()
  } catch (error) {
    logger.error({ action: 'upsertAdminRole', roleId: role.id, oidcGroup: role.oidcGroup, err: error }, 'Keycloak hook failed')
    return pluginResult.returnUnexpectedError(error)
  }
}

export const deleteAdminRole: StepCall<AdminRole> = async ({ args: role }) => {
  if (!role.oidcGroup) return { status: { result: 'OK', message: 'No OIDC Group defined' } }
  const pluginResult = new PluginResultBuilder('Deleted')
  try {
    const kcClient = await getkcClient()
    let group: GroupRepresentation | undefined
    if (role.oidcGroup.startsWith('/')) {
      const name = role.oidcGroup.split('/').pop() || ''
      const groups = await kcClient.groups.find({ search: name })
      group = groups.find(g => g.path === role.oidcGroup)
    } else {
      const groupOrVoid = await getGroupByName(kcClient, role.oidcGroup)
      group = groupOrVoid || undefined
    }

    if (group?.id) {
      await Promise.all(role.members.map((user) => {
        return kcClient.users.delFromGroup({
          id: user.id,
          groupId: group!.id!,
        })
          .catch((err) => {
            pluginResult.addKoMessage(`Can't remove ${user.email} from keycloak admin group`)
            pluginResult.addExtra(`remove-${user.id}`, err)
          })
      }))
    }
    logger.info({ action: 'deleteAdminRole', roleId: role.id, oidcGroup: role.oidcGroup }, 'Keycloak hook done')
    return pluginResult.getResultObject()
  } catch (error) {
    logger.error({ action: 'deleteAdminRole', roleId: role.id, oidcGroup: role.oidcGroup, err: error }, 'Keycloak hook failed')
    return pluginResult.returnUnexpectedError(error)
  }
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
  try {
    const kcClient = await getkcClient()
    await getOrCreateGroupByPath(kcClient, role.oidcGroup)
    logger.info({ action: 'upsertProjectRole', roleId: role.id, oidcGroup: role.oidcGroup }, 'Keycloak hook done')
    return {
      status: {
        result: 'OK',
        message: 'Synced',
      },
    }
  } catch (error) {
    logger.error({ action: 'upsertProjectRole', roleId: role.id, oidcGroup: role.oidcGroup, err: error }, 'Keycloak hook failed')
    return {
      error,
      status: {
        result: 'KO',
        message: 'Failed to sync role',
      },
    }
  }
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
  try {
    const kcClient = await getkcClient()
    const [projectName, pluginName, roleName] = role.oidcGroup.split('/').slice(1)
    if (!projectName || !pluginName || !roleName) throw new Error('Invalid OIDC group format')
    const projectGroup = await getGroupByName(kcClient, projectName)
    if (projectGroup?.id) {
      const pluginGroups = await getAllSubgroups(kcClient, projectGroup.id, 0)
      const pluginGroup = pluginGroups.find(({ name }) => name === pluginName) as Required<GroupRepresentation> | undefined
      if (pluginGroup?.id) {
        const roleGroups = await getAllSubgroups(kcClient, pluginGroup.id, 0)
        const roleGroup = roleGroups.find(({ name }) => name === roleName) as Required<GroupRepresentation> | undefined
        if (roleGroup?.id) {
          await deleteGroup(kcClient, roleGroup.id)
          logger.info({ action: 'deleteProjectRole', roleId: role.id, oidcGroup: role.oidcGroup, outcome: 'deleted' }, 'Keycloak hook done')
          return {
            status: {
              result: 'OK',
              message: 'Deleted',
            },
          }
        }
      }
    }
    logger.info({ action: 'deleteProjectRole', roleId: role.id, oidcGroup: role.oidcGroup, outcome: 'already-deleted' }, 'Keycloak hook done')
    return {
      status: {
        result: 'OK',
        message: 'Already deleted',
      },
    }
  } catch (error) {
    logger.error({ action: 'deleteProjectRole', roleId: role.id, oidcGroup: role.oidcGroup, err: error }, 'Keycloak hook failed')
    return {
      error,
      status: {
        result: 'KO',
        message: 'Failed to delete role',
      },
    }
  }
}

export const upsertProjectMember: StepCall<ProjectMember> = async ({ args: member }) => {
  const pluginResult = new PluginResultBuilder('Synced')
  try {
    const kcClient = await getkcClient()

    const projectGroup = await getOrCreateProjectGroup(kcClient, member.project.slug)
    const consoleGroup = await getOrCreateChildGroup(kcClient, projectGroup.id, consoleGroupName)
    const allRoleGroups = await getAllSubgroups(kcClient, consoleGroup.id, 0)
    const userGroups = await kcClient.users.listGroups({ id: member.userId })

    const userRolesOidcGroups = member.roles
      .map(r => r.oidcGroup)
      .filter((g): g is string => !!g)

    // Sync Roles
    let groupMembershipChanges = 0
    for (const roleGroup of allRoleGroups) {
      if (!roleGroup.id || !roleGroup.path) continue
      const isMember = userGroups.some(ug => ug.id === roleGroup.id)
      const shouldBeMember = userRolesOidcGroups.includes(roleGroup.path)

      if (shouldBeMember && !isMember) {
        groupMembershipChanges += 1
        await kcClient.users.addToGroup({ id: member.userId, groupId: roleGroup.id })
      } else if (!shouldBeMember && isMember) {
        groupMembershipChanges += 1
        await kcClient.users.delFromGroup({ id: member.userId, groupId: roleGroup.id })
      }
    }

    logger.info({ action: 'upsertProjectMember', projectSlug: member.project.slug, groupMembershipChanges }, 'Keycloak hook done')
    return pluginResult.getResultObject()
  } catch (error) {
    logger.error({ action: 'upsertProjectMember', projectSlug: member.project.slug, err: error }, 'Keycloak hook failed')
    return pluginResult.returnUnexpectedError(error)
  }
}

export const deleteProjectMember: StepCall<ProjectMember> = async ({ args: member }) => {
  const pluginResult = new PluginResultBuilder('Deleted')
  try {
    const kcClient = await getkcClient()
    if (!member.userId) return pluginResult.getResultObject()

    const projectGroup = await getGroupByName(kcClient, member.project.slug)
    if (!projectGroup?.id) return pluginResult.getResultObject()

    const userGroups = await kcClient.users.listGroups({ id: member.userId })
    const projectGroups = userGroups.filter(g => g.path?.startsWith(projectGroup.path!))

    let removedCount = 0
    for (const group of projectGroups) {
      if (group.id) {
        await kcClient.users.delFromGroup({ id: member.userId, groupId: group.id })
        removedCount += 1
      }
    }

    logger.info({ action: 'deleteProjectMember', projectSlug: member.project.slug, removedCount }, 'Keycloak hook done')
    return pluginResult.getResultObject()
  } catch (error) {
    logger.error({ action: 'deleteProjectMember', projectSlug: member.project.slug, err: error }, 'Keycloak hook failed')
    return pluginResult.returnUnexpectedError(error)
  }
}

function getClientZoneId(zone: ZoneObject): string {
  return `argocd-${zone.slug}-zone`
}
