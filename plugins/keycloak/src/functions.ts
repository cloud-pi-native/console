import type { EmptyPayload, Project, StepCall, UserAdmin, UserEmail } from '@cpn-console/hooks'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'
import type { CustomGroup } from './group.js'
import { parseError } from '@cpn-console/hooks'
import { getkcClient } from './client.js'
import { consoleGroupName, getAllSubgroups, getGroupByName, getOrCreateChildGroup, getOrCreateProjectGroup } from './group.js'

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
        message: error.message,
      },
    }
  }
}

export const retrieveKeycloakAdminUsers: StepCall<EmptyPayload> = async () => {
  const kcClient = await getkcClient()
  try {
    const adminGroup = await getGroupByName(kcClient, 'admin')
    if (!adminGroup?.id) throw new Error('Admin group not found')
    const adminIds = (await kcClient.groups.listMembers({ id: adminGroup.id })).map(admin => admin.id)

    return {
      status: { result: 'OK' },
      adminIds,
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
    }
  }
}

export const updateUserAdminKcGroupMembership: StepCall<UserAdmin> = async ({ args: { id, isAdmin } }) => {
  const kcClient = await getkcClient()
  try {
    const [adminGroup, user] = await Promise.all([
      getGroupByName(kcClient, 'admin'),
      kcClient.users.findOne({ id }),
    ])
    if (!adminGroup?.id) throw new Error('Admin group not found')
    if (!user?.id) throw new Error('User to update not found')

    if (isAdmin) await kcClient.users.addToGroup({ id, groupId: adminGroup.id })
    else await kcClient.users.delFromGroup({ id, groupId: adminGroup.id })

    return {
      status: {
        result: 'OK',
        message: `${user.email ?? user.id} was ${isAdmin ? 'promoted to' : 'demoted from'} /admin group`,
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
    }
  }
}

export const deleteProject: StepCall<Project> = async ({ args: project }) => {
  try {
    const kcClient = await getkcClient()
    const projectName = `${project.organization.name}-${project.name}`
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
        message: error.message,
      },
    }
  }
}

export const upsertProject: StepCall<Project> = async ({ args: project }) => {
  try {
    const kcClient = await getkcClient()
    const projectName = `${project.organization.name}-${project.name}`
    const projectGroup = await getOrCreateProjectGroup(kcClient, projectName)
    const groupMembers = await kcClient.groups.listMembers({ id: projectGroup.id })

    // Ensure project membership exists
    for (const member of groupMembers) {
      if (!project.users.some(({ id }) => id === member.id)) {
        await kcClient.users.delFromGroup({
          // @ts-ignore id is present on user, bad typing in lib
          id: member.id,
          groupId: projectGroup.id,
        })
      }
    }
    for (const user of project.users) {
      if (!groupMembers.some(({ id }) => id === user.id)) {
        await kcClient.users.addToGroup({
          id: user.id,
          groupId: projectGroup.id,
        })
      }
    }

    // Ensure envs subgroups exists
    const projectGroups = await getAllSubgroups(kcClient, projectGroup.id, 0)

    const consoleGroup: Required<CustomGroup> = projectGroups.find(({ name }) => name === consoleGroupName) as Required<GroupRepresentation>
      ?? await getOrCreateChildGroup(kcClient, projectGroup.id, consoleGroupName) as Required<GroupRepresentation>

    const envGroups = await getAllSubgroups(kcClient, consoleGroup.id, 0) as CustomGroup[]

    for (const environment of project.environments) {
      const envGroup: Required<CustomGroup> = envGroups.find(group => group.name === environment.name) as Required<CustomGroup>
        ?? await getOrCreateChildGroup(kcClient, consoleGroup.id, environment.name)

      const roGroup = await getOrCreateChildGroup(kcClient, envGroup.id, 'RO')
      const rwGroup = await getOrCreateChildGroup(kcClient, envGroup.id, 'RW')

      // Ensure envs permissions membership exists
      for (const permission of environment.permissions) {
        if (permission.permissions.ro) {
          await kcClient.users.addToGroup({ id: permission.userId, groupId: roGroup.id })
        } else {
          await kcClient.users.delFromGroup({ id: permission.userId, groupId: roGroup.id })
        }
        if (permission.permissions.rw) {
          await kcClient.users.addToGroup({ id: permission.userId, groupId: rwGroup.id })
        } else { await kcClient.users.delFromGroup({ id: permission.userId, groupId: rwGroup.id }) }
      }
    }
    for (const subGroup of envGroups) {
      if (!project.environments.some(({ name }) => name === subGroup.name)) {
        kcClient.groups.del({ id: subGroup.id })
      }
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
