import type { StepCall, EnvironmentCreateArgs, EnvironmentDeleteArgs, ArchiveProjectExecArgs, CreateProjectExecArgs, AddUserToProjectExecArgs, RemoveUserFromProjectExecArgs, RetrieveUserByEmailArgs, PermissionManageUserArgs } from '@dso-console/hooks'
import { addMembers, removeMembers } from './permission.js'
import { getOrCreateChildGroup, getOrCreateProjectGroup, getProjectGroupByName } from './group.js'
import { getkcClient } from './client.js'
import { getUserByEmail } from './user.js'
import { AsyncReturnType } from '@dso-console/shared'

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
        // @ts-ignore prévoir une fonction générique
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
    if (group) {
      if (!group.id) throw Error('Unexpected error in keycloak plugin, no group id returned')
      await addMembers(kcClient, [owner.id], group.id)
      message = 'Group already exists'
    } else {
      newGroup = await kcClient.groups.create({
        name: projectName,
      })
      await addMembers(kcClient, [owner.id], newGroup.id)
      message = 'Group created'
    }

    return {
      status: { result: 'OK', message },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
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
    if (!group.id) throw Error('Unexpected error in keycloak plugin, no group id returned')
    await addMembers(kcClient, [user.id], group.id)

    return {
      status: { result: 'OK' },
      group,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
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
    if (!group.id) throw Error('Unexpected error in keycloak plugin, no group id returned')
    await removeMembers(kcClient, [user.id], group.id)

    return {
      status: { result: 'OK' },
      group,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
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
    const group = await getOrCreateProjectGroup(kcClient, projectName)
    if (group.id) {
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
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const createKeycloakEnvGroup: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const kcClient = await getkcClient()
    const { organization, project, environment, owner, cluster } = payload.args

    const projectName = `${organization}-${project}`
    const envGroupName = `${environment}-${cluster.label}`
    const projectGroup = await getOrCreateProjectGroup(kcClient, projectName)
    const envGroup = await getOrCreateChildGroup(kcClient, projectGroup.id, envGroupName)
    const roGroup = await getOrCreateChildGroup(kcClient, envGroup.id, 'RO')
    const rwGroup = await getOrCreateChildGroup(kcClient, envGroup.id, 'RW')
    await kcClient.users.addToGroup({ id: owner.id, groupId: roGroup.id })
    await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroup.id })
    return {
      status: { result: 'OK' },
      roGroup: `/${projectName}/${envGroupName}/RO`,
      rwGroup: `/${projectName}/${envGroupName}/RW`,
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

export const deleteKeycloakEnvGroup: StepCall<EnvironmentDeleteArgs> = async (payload) => {
  try {
    let message = 'Already missing'
    const kcClient = await getkcClient()
    const { organization, project, environment, cluster } = payload.args
    const projectName = `${organization}-${project}`
    const projectGroupSearch = await kcClient.groups.find({ search: projectName })
    const projectGroup = projectGroupSearch?.find(grpRes => grpRes.name === projectName)
    const subGroupName = `${environment}-${cluster.label}`
    if (projectGroup) {
      const envGroup = projectGroup.subGroups?.find(subGrp => subGrp.name === subGroupName)
      if (envGroup) {
        if (!envGroup.id) throw Error('Unexpected error in keycloak plugin, no group id returned')
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

export const manageKeycloakPermission: StepCall<PermissionManageUserArgs> = async (payload) => {
  try {
    const kcClient = await getkcClient()
    const { organization, project, environment, user, cluster, permissions } = payload.args

    const projectName = `${organization}-${project}`
    const projectGroup = await getOrCreateProjectGroup(kcClient, projectName)

    const envGroupName = `${environment}-${cluster.label}`

    const envSubGroup = await getOrCreateChildGroup(kcClient, projectGroup.id, envGroupName, projectGroup.subGroups)

    const roGroup = await getOrCreateChildGroup(kcClient, envSubGroup.id, 'RO', envSubGroup.subGroups)
    const rwGroup = await getOrCreateChildGroup(kcClient, envSubGroup.id, 'RW', envSubGroup.subGroups)

    if (permissions.ro) await kcClient.users.addToGroup({ id: user.id, groupId: roGroup.id })
    else await kcClient.users.delFromGroup({ id: user.id, groupId: roGroup.id })

    if (permissions.rw) await kcClient.users.addToGroup({ id: user.id, groupId: rwGroup.id })
    else await kcClient.users.delFromGroup({ id: user.id, groupId: rwGroup.id })

    return {
      status: { result: 'OK' },
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
