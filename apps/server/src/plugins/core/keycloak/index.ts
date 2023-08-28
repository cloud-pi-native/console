import type { StepCall } from '@/plugins/hooks/hook.js'
import type { DeleteEnvironmentExecArgs, InitializeEnvironmentExecArgs } from '@/plugins/hooks/environment.js'
import type { ArchiveProjectExecArgs, CreateProjectExecArgs } from '@/plugins/hooks/project.js'
import type { AddUserToProjectExecArgs, RemoveUserFromProjectExecArgs, RetrieveUserByEmailArgs } from '@/plugins/hooks/team.js'
import { addMembers, removeMembers } from './permission.js'
import { getProjectGroupByName } from './group.js'
import { getkcClient } from './client.js'
import { getUserByEmail } from './user.js'
import { AsyncReturnType } from '@/utils/controller.js'

export const retrieveKeycloakUserByEmail: StepCall<RetrieveUserByEmailArgs> = async (payload) => {
  const kcClient = await getkcClient()
  try {
    const { email } = payload.args
    const user = await getUserByEmail(kcClient, email)

    return {
      status: { result: 'OK' },
      user,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const createKeycloakProjectGroup: StepCall<CreateProjectExecArgs> = async (payload) => {
  const kcClient = await getkcClient()
  try {
    let message: string
    const { organization, project, owner } = payload.args
    const projectName = `${organization}-${project}`
    let newGroup: void | AsyncReturnType<typeof kcClient.groups.create>

    const group = await getProjectGroupByName(kcClient, projectName)
    if (!group) {
      newGroup = await kcClient.groups.create({
        name: projectName,
      })
      await addMembers(kcClient, [owner.id], newGroup.id)
      message = 'Group created'
    } else {
      await addMembers(kcClient, [owner.id], group.id)
      message = 'Group already exists'
    }

    return {
      status: { result: 'OK', message },
      group: newGroup || group,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const addKeycloakUserToProjectGroup: StepCall<AddUserToProjectExecArgs> = async (payload) => {
  const kcClient = await getkcClient()
  try {
    const { organization, project, user } = payload.args
    const projectName = `${organization}-${project}`
    const group = await getProjectGroupByName(kcClient, projectName)
    if (!group) {
      throw new Error(`Le groupe keycloak ${projectName} n'existe pas`)
    }
    await addMembers(kcClient, [user.id], group.id)

    return {
      status: { result: 'OK' },
      group,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const removeKeycloakUserFromProjectGroup: StepCall<RemoveUserFromProjectExecArgs> = async (payload) => {
  const kcClient = await getkcClient()
  try {
    const { organization, project, user } = payload.args
    const projectName = `${organization}-${project}`
    const group = await getProjectGroupByName(kcClient, projectName)
    if (!group) {
      throw new Error(`Le groupe keycloak ${projectName} n'existe pas`)
    }
    await removeMembers(kcClient, [user.id], group.id)

    return {
      status: { result: 'OK' },
      group,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteKeycloakProjectGroup: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  try {
    const kcClient = await getkcClient()
    const { organization, project } = payload.args
    const projectName = `${organization}-${project}`
    const group = await getProjectGroupByName(kcClient, projectName)
    if (group) {
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
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const createKeycloakEnvGroup: StepCall<InitializeEnvironmentExecArgs> = async (payload) => {
  try {
    const kcClient = await getkcClient()
    const { organization, project, environment, owner } = payload.args
    const projectName = `${organization}-${project}`
    const projectGroup = await getProjectGroupByName(kcClient, projectName)
    if (!projectGroup) throw Error(`Unable to find parent group '/${projectGroup}'`)
    let group = projectGroup.subGroups.find(subGrp => subGrp.name === environment)
    if (!group) {
      group = await kcClient.groups.setOrCreateChild({
        id: projectGroup.id,
      }, {
        name: environment,
      })
      const roGroup = await kcClient.groups.setOrCreateChild({ id: group.id }, { name: 'RO' })
      const rwGroup = await kcClient.groups.setOrCreateChild({ id: group.id }, { name: 'RW' })
      await kcClient.users.addToGroup({ id: owner.id, groupId: roGroup.id })
      await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroup.id })
      return {
        status: { result: 'OK' },
        group,
        roGroup: `/${projectName}/${environment}/RO`,
        rwGroup: `/${projectName}/${environment}/RW`,
      }
    }
    return {
      status: { result: 'OK', message: 'Already Exists' },
      group,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteKeycloakEnvGroup: StepCall<DeleteEnvironmentExecArgs> = async (payload) => {
  try {
    let message = 'Already missing'
    const kcClient = await getkcClient()
    const { organization, project, environment } = payload.args
    const projectName = `${organization}-${project}`
    const projectGroupSearch = await kcClient.groups.find({ search: projectName })
    const projectGroup = projectGroupSearch?.find(grpRes => grpRes.name === projectName)
    if (projectGroup) {
      const envGroup = projectGroup.subGroups.find(subGrp => subGrp.name === environment)
      if (envGroup) {
        await kcClient.groups.del({ id: envGroup.id })
        message = 'Deleted'
      }
    }
    return {
      status: { result: 'OK', message },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}
