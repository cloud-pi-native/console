import type { StepCall } from '@/plugins/hooks/hook.js'
import type { EnvironmentCreateArgs, EnvironmentDeleteArgs } from '@/plugins/hooks/environment.js'
import type { ArchiveProjectExecArgs, CreateProjectExecArgs } from '@/plugins/hooks/project.js'
import type { AddUserToProjectExecArgs, RemoveUserFromProjectExecArgs, RetrieveUserByEmailArgs } from '@/plugins/hooks/team.js'
import { addMembers, removeMembers } from './permission.js'
import { getProjectGroupById, getProjectGroupByName } from './group.js'
import { getkcClient } from './client.js'
import { getUserByEmail } from './user.js'
import { AsyncReturnType } from '@/utils/controller.js'
import { PermissionManageUserArgs } from '@/plugins/hooks/permission.js'

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

export const createKeycloakEnvGroup: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const kcClient = await getkcClient()
    const { organization, project, environment, owner, cluster } = payload.args

    const projectName = `${organization}-${project}`
    const projectGroup = await getProjectGroupByName(kcClient, projectName)
    const subGroupName = `${environment}-${cluster.label}`
    if (!projectGroup) throw Error(`Unable to find parent group '/${projectGroup}'`)
    let group = projectGroup.subGroups.find(subGrp => subGrp.name === environment)
    if (!group) {
      group = await kcClient.groups.createChildGroup({
        id: projectGroup.id,
      }, {
        name: subGroupName,
      })
      const roGroup = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'RO' })
      const rwGroup = await kcClient.groups.createChildGroup({ id: group.id }, { name: 'RW' })
      await kcClient.users.addToGroup({ id: owner.id, groupId: roGroup.id })
      await kcClient.users.addToGroup({ id: owner.id, groupId: rwGroup.id })
      return {
        status: { result: 'OK' },
        group,
        roGroup: `/${projectName}/${subGroupName}/RO`,
        rwGroup: `/${projectName}/${subGroupName}/RW`,
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
      const envGroup = projectGroup.subGroups.find(subGrp => subGrp.name === subGroupName)
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

export const manageKeycloakPermission: StepCall<PermissionManageUserArgs> = async (payload) => {
  try {
    const kcClient = await getkcClient()
    const { organization, project, environment, user, cluster, permissions } = payload.args

    const projectName = `${organization}-${project}`
    const projectGroup = await getProjectGroupByName(kcClient, projectName)
    const subGroupName = `${environment}-${cluster.label}`
    console.log({ projectGroup })
    if (!projectGroup) throw new Error(`Unable to find parent group '/${projectGroup}'`)
    const subGroupEnv = projectGroup.subGroups.find(subGrp => subGrp.name === subGroupName)
    const group = await getProjectGroupById(kcClient, subGroupEnv.id)
    if (!group) throw new Error(`Unable to find parent subGroup '/${projectGroup}/${subGroupName}'`)

    const roGroup = group.subGroups.find(({ name }) => name === 'RO')
    const rwGroup = group.subGroups.find(({ name }) => name === 'RW')

    if (permissions.ro) await kcClient.users.addToGroup({ id: user.id, groupId: roGroup.id })
    else await kcClient.users.delFromGroup({ id: user.id, groupId: roGroup.id })

    if (permissions.rw) await kcClient.users.addToGroup({ id: user.id, groupId: rwGroup.id })
    else await kcClient.users.delFromGroup({ id: user.id, groupId: rwGroup.id })

    return {
      status: { result: 'OK' },
    }
  } catch (error) {
    console.log(error)
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

// console.log(await manageKeycloakPermission({
//   args: {
//     cluster: {
//       label: 'c7',
//     },
//     environment: 'test',
//     organization: 'mia',
//     project: 'test-keycloak',
//     user: {
//       email: 'atardif@adlere.fr',
//       id: 'def1bc80-40ea-48d7-a119-ff06696635b6',
//     },
//     permissions: {
//       ro: true,
//       rw: true,
//     }
//   },
// }))
