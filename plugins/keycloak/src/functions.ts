import type { StepCall, Project, UserLite } from '@cpn-console/hooks'
import { getOrCreateChildGroup, getOrCreateProjectGroup, getProjectGroupByName } from './group.js'
import { getkcClient } from './client.js'
import { parseError } from '@cpn-console/hooks'

export const retrieveKeycloakUserByEmail: StepCall<UserLite> = async ({ args: { email } }) => {
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

export const deleteProject: StepCall<Project> = async ({ args: project }) => {
  try {
    const kcClient = await getkcClient()
    const projectName = `${project.organization.name}-${project.name}`
    const group = await getProjectGroupByName(kcClient, projectName)
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
        kcClient.users.delFromGroup({
          // @ts-ignore id is present on user, bad typing in lib
          id: member.id,
          groupId: projectGroup.id,
        })
      }
    }
    for (const user of project.users) {
      if (!groupMembers.some(({ id }) => id === user.id)) {
        kcClient.users.addToGroup({
          id: user.id,
          groupId: projectGroup.id,
        })
      }
    }

    // Ensure envs subgroups exists
    for (const environment of project.environments) {
      const envGroup = await getOrCreateChildGroup(kcClient, projectGroup.id, environment.name)
      const roGroup = await getOrCreateChildGroup(kcClient, envGroup.id, 'RO')
      const rwGroup = await getOrCreateChildGroup(kcClient, envGroup.id, 'RW')
      // Ensure envs permissions membership exists
      for (const permission of environment.permissions) {
        if (permission.permissions.ro) await kcClient.users.addToGroup({ id: permission.userId, groupId: roGroup.id })
        else await kcClient.users.delFromGroup({ id: permission.userId, groupId: roGroup.id })

        if (permission.permissions.rw) await kcClient.users.addToGroup({ id: permission.userId, groupId: rwGroup.id })
        else await kcClient.users.delFromGroup({ id: permission.userId, groupId: rwGroup.id })
      }
    }
    for (const subGroup of projectGroup.subGroups) {
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
