import type { AdminRole, Project, StepCall, UserEmail, ZoneObject, ProjectMemberPayload } from '@cpn-console/hooks'
import { ENABLED, type ProjectRole } from '@cpn-console/shared'
import { generateRandomPassword, parseError, PluginResultBuilder } from '@cpn-console/hooks'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js'
import type { CustomGroup } from './group.js'
import { consoleGroupName, deleteGroup, getAllSubgroups, getGroupByName, getOrCreateChildGroup, getOrCreateGroupByPath, getOrCreateProjectGroup } from './group.js'
import { getkcClient } from './client.js'

export const retrieveKeycloakUserByEmail: StepCall<UserEmail> = async ({ args: { email } }) => {
  const kcClient = await getkcClient()
  try {
    const user = (await kcClient.users.find({ email }))[0]

    return {
      status: { result: 'OK' },
      user,
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const deleteProject: StepCall<Project> = async ({ args: project }) => {
  try {
    const kcClient = await getkcClient()
    const projectName = project.slug
    const group = await getGroupByName(kcClient, projectName)
    if (group?.id) {
      await kcClient.groups.del({ id: group.id })
      return {
        status: {
          result: 'OK',
          message: 'Deleted',
        },
      }
    }
    return {
      status: {
        result: 'OK',
        message: 'Already Missing',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const upsertProject: StepCall<Project> = async (payload) => {
  const pluginResult = new PluginResultBuilder('Up-to-date')
  try {
    const kcClient = await getkcClient()
    const projectName = payload.args.slug
    const purgeEnabled = payload.config.argocd?.purge === ENABLED
    const projectGroup = await getOrCreateProjectGroup(kcClient, projectName)

    const groupMembers = await kcClient.groups.listMembers({ id: projectGroup.id })

    await Promise.all([
      ...groupMembers.map((member) => {
        if (!payload.args.users.some(({ id }) => id === member.id)) {
          if (purgeEnabled) {
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
        }
        return undefined
      }),
      ...payload.args.users.map((user) => {
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
    for (const environment of payload.args.environments) {
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

    await Promise.all(envGroups.map((subGroup) => {
      if (!payload.args.environments.some(({ name }) => name === subGroup.name)) {
        return kcClient.groups.del({ id: subGroup.id })
      }
      return undefined
    }))

    return pluginResult.getResultObject()
  } catch (error) {
    return pluginResult.returnUnexpectedError(error)
  }
}

export const upsertZone: StepCall<ZoneObject> = async ({ args: zone, apis }) => {
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
    if (result.length > 0 && result[0].id) {
      await kcClient.clients.update({ id: result[0].id }, client)
    } else {
      const password = generateRandomPassword(30)
      await apis.vault.write({ clientSecret: password }, 'keycloak')
      await kcClient.clients.create({
        secret: password,
        ...client,
      })
    }
    return {
      status: {
        result: 'OK',
        message: 'Up-to-date',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}

export const deleteZone: StepCall<ZoneObject> = async ({ args: zone }) => {
  try {
    const kcClient = await getkcClient()
    const clientId = getClientZoneId(zone)
    const result = await kcClient.clients.find({ clientId, max: 1 })
    if (result.length > 0 && result[0].id) {
      await kcClient.clients.del({ id: result[0].id })
      return {
        status: {
          result: 'OK',
          message: 'Deleted',
        },
      }
    }
    return {
      status: {
        result: 'OK',
        message: 'Already Missing',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
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

    return pluginResult.getResultObject()
  } catch (error) {
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
    return pluginResult.getResultObject()
  } catch (error) {
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
    return {
      status: {
        result: 'OK',
        message: 'Synced',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
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
          return {
            status: {
              result: 'OK',
              message: 'Deleted',
            },
          }
        }
      }
    }
    return {
      status: {
        result: 'OK',
        message: 'Already deleted',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to delete role',
      },
    }
  }
}

export const upsertProjectMember: StepCall<ProjectMemberPayload> = async ({ args: member }) => {
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
    for (const roleGroup of allRoleGroups) {
      if (!roleGroup.id || !roleGroup.path) continue
      const isMember = userGroups.some(ug => ug.id === roleGroup.id)
      const shouldBeMember = userRolesOidcGroups.includes(roleGroup.path)

      if (shouldBeMember && !isMember) {
        await kcClient.users.addToGroup({ id: member.userId, groupId: roleGroup.id })
      } else if (!shouldBeMember && isMember) {
        await kcClient.users.delFromGroup({ id: member.userId, groupId: roleGroup.id })
      }
    }

    return pluginResult.getResultObject()
  } catch (error) {
    return pluginResult.returnUnexpectedError(error)
  }
}

export const deleteProjectMember: StepCall<ProjectMemberPayload> = async ({ args: member }) => {
  const pluginResult = new PluginResultBuilder('Deleted')
  try {
    const kcClient = await getkcClient()
    if (!member.userId) return pluginResult.getResultObject()

    const projectGroup = await getGroupByName(kcClient, member.project.slug)
    if (!projectGroup?.id) return pluginResult.getResultObject()

    const userGroups = await kcClient.users.listGroups({ id: member.userId })
    const projectGroups = userGroups.filter(g => g.path?.startsWith(projectGroup.path!))

    for (const group of projectGroups) {
      if (group.id) {
        await kcClient.users.delFromGroup({ id: member.userId, groupId: group.id })
      }
    }

    return pluginResult.getResultObject()
  } catch (error) {
    return pluginResult.returnUnexpectedError(error)
  }
}

function getClientZoneId(zone: ZoneObject): string {
  return `argocd-${zone.slug}-zone`
}
