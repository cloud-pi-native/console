import type { AdminRole, Project, StepCall, UserEmail, ZoneObject } from '@cpn-console/hooks'
import { generateRandomPassword, parseError, PluginResultBuilder, specificallyEnabled } from '@cpn-console/hooks'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js'
import type { CustomGroup } from './group.js'
import { consoleGroupName, getAllSubgroups, getGroupByName, getOrCreateChildGroup, getOrCreateGroupByPath, getOrCreateProjectGroup } from './group.js'
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

export const upsertProject: StepCall<Project> = async ({ args: project, config }) => {
  const pluginResult = new PluginResultBuilder('Up-to-date')
  try {
    const kcClient = await getkcClient()
    const projectName = project.slug
    const purge = config.keycloak?.purge
    const projectGroup = await getOrCreateProjectGroup(kcClient, projectName)

    const groupMembers = await kcClient.groups.listMembers({ id: projectGroup.id })

    await Promise.all([
      ...groupMembers.map((member) => {
        if (!project.users.some(({ id }) => id === member.id)) {
          if (specificallyEnabled(purge)) {
            return kcClient.users.delFromGroup({
            // @ts-ignore id is present on user, bad typing in lib
              id: member.id,
              groupId: projectGroup.id,
            })
              .catch((err) => {
                pluginResult.addKoMessage(`Can't remove ${member.email} from keycloak project group`)
                pluginResult.addExtra(`remove-${member.id}`, err)
              })
          } else {
            console.warn(`User ${member.email} is not in project ${projectName} anymore, but purge is disabled`)
          }
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

    await Promise.all(envGroups.map((subGroup) => {
      if (!project.environments.some(({ name }) => name === subGroup.name)) {
        return kcClient.groups.del({ id: subGroup.id })
      }
      return undefined
    }))

    // Sync Roles
    for (const role of project.roles) {
      if (!role.oidcGroup) continue
      try {
        const group = await getOrCreateGroupByPath(kcClient, role.oidcGroup)
        if (!group.id) continue
        const groupMembers = await kcClient.groups.listMembers({ id: group.id })

        await Promise.all([
          ...groupMembers.map((member) => {
            if (!role.users.some(({ id }) => id === member.id)) {
              if (specificallyEnabled(purge)) {
                return kcClient.users.delFromGroup({
                  id: member.id!,
                  groupId: group.id!,
                })
                  .catch((err) => {
                    pluginResult.addKoMessage(`Can't remove ${member.email} from keycloak role group ${role.name}`)
                    pluginResult.addExtra(`remove-role-${role.name}-${member.id}`, err)
                  })
              } else {
                console.warn(`User ${member.email} is not in role ${role.name} anymore, but purge is disabled`)
              }
            }
            return undefined
          }),
          ...role.users.map((user) => {
            if (!groupMembers.some(({ id }) => id === user.id)) {
              return kcClient.users.addToGroup({
                id: user.id,
                groupId: group.id!,
              })
                .catch((err) => {
                  pluginResult.addKoMessage(`Can't add ${user.email} to keycloak role group ${role.name}`)
                  pluginResult.addExtra(`add-role-${role.name}-${user.id}`, err)
                })
            }
            return undefined
          }),
        ])
      } catch (error) {
        pluginResult.addKoMessage(`Failed to sync role ${role.name}`)
        pluginResult.addExtra(`role-${role.name}`, error)
      }
    }

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

export const upsertAdminRole: StepCall<AdminRole> = async ({ args: role, config }) => {
  if (!role.oidcGroup) return { status: { result: 'OK', message: 'No OIDC Group defined' } }
  const pluginResult = new PluginResultBuilder('Up-to-date')
  const purge = config.keycloak?.purge
  try {
    const kcClient = await getkcClient()
    const group = await getOrCreateGroupByPath(kcClient, role.oidcGroup)
    const groupMembers = await kcClient.groups.listMembers({ id: group.id })

    await Promise.all([
      ...groupMembers.map((member) => {
        if (member.id && !role.members.some(({ id }) => id === member.id)) {
          if (specificallyEnabled(purge)) {
            return kcClient.users.delFromGroup({
              id: member.id,
              groupId: group!.id!,
            })
              .catch((err) => {
                pluginResult.addKoMessage(`Can't remove ${member.email} from keycloak admin group`)
                pluginResult.addExtra(`remove-${member.id}`, err)
              })
          } else {
            console.warn(`User ${member.email} is not in admin role ${role.oidcGroup} anymore, but purge is disabled`)
          }
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

function getClientZoneId(zone: ZoneObject): string {
  return `argocd-${zone.slug}-zone`
}
