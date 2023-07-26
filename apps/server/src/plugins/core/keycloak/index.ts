import { addMembers, removeMembers } from './permission.js'
import { getProjectGroupByName } from './group.js'
import { getkcClient } from './client.js'

export const createKeycloakProjectGroup = async (payload) => {
  const kcClient = await getkcClient()
  try {
    const { organization, project, owner } = payload.args
    const projectName = `${organization}-${project}`
    let group = await getProjectGroupByName(kcClient, projectName)
    if (!group) {
      group = await kcClient.groups.create({
        name: projectName,
      })
    }
    await addMembers(kcClient, [owner.id], group.id)

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

export const addKeycloakUserToProjectGroup = async (payload) => {
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

export const removeKeycloakUserFromProjectGroup = async (payload) => {
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

export const deleteKeycloakProjectGroup = async (payload) => {
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

export const createKeycloakEnvGroup = async (payload) => {
  try {
    const kcClient = await getkcClient()
    const { organization, project, environment, owner } = payload.args
    const projectName = `${organization}-${project}`
    const projectGroup = await getProjectGroupByName(kcClient, projectName)
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
      status: { result: 'Already Exists' },
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

export const deleteKeycloakEnvGroup = async (payload) => {
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
