import type { Project, StepCall, UserEmail, ZoneObject } from '@cpn-console/hooks'
import { generateRandomPassword, parseError } from '@cpn-console/hooks'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js'
import type { CustomGroup } from './group.js'
import { consoleGroupName, getAllGroups, getGroupByName, getOrCreateChildGroup, getOrCreateProjectGroup } from './group.js'
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

export const upsertProject: StepCall<Project> = async ({ args: project }) => {
  try {
    const kcClient = await getkcClient()
    const projectName = project.slug
    const projectGroup = await getOrCreateProjectGroup(kcClient, projectName)
    const groupMembers = await kcClient.groups.listMembers({ id: projectGroup.id })

    await Promise.all([
      ...groupMembers.map((member) => {
        if (!project.users.some(({ id }) => id === member.id)) {
          return kcClient.users.delFromGroup({
          // @ts-ignore id is present on user, bad typing in lib
            id: member.id,
            groupId: projectGroup.id,
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
        }
        return undefined
      }),
    ])

    // Ensure envs subgroups exists
    const projectGroups = await getAllGroups(kcClient, 0, [], projectGroup.id)

    const consoleGroup: Required<CustomGroup> = projectGroups.find(({ name }) => name === consoleGroupName) as Required<GroupRepresentation>
      ?? await getOrCreateChildGroup(kcClient, projectGroup.id, consoleGroupName) as Required<GroupRepresentation>

    const envGroups = await getAllGroups(kcClient, 0, [], consoleGroup.id) as CustomGroup[]

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

function getClientZoneId(zone: ZoneObject): string {
  return `argocd-${zone.slug}-zone`
}
