import { addMembers } from './permission.js'
import { getProjectGroupByName } from './group.js'
import { getkcClient } from './client.js'

export const createKeycloakProjectGroup = async (payload) => {
  const kcClient = await getkcClient()
  try {
    const { organization, project, userId } = payload.args
    const projectName = `${organization}-${project}`
    let group = await getProjectGroupByName(kcClient, projectName)
    if (!group) {
      group = await kcClient.groups.create({
        name: projectName,
      })
    }
    await addMembers(kcClient, [userId], group.id)

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
    const { organization, project, environment } = payload.args
    const projectName = `${organization}-${project}`
    const projectGroup = await getProjectGroupByName(kcClient, projectName)
    let group = projectGroup.subGroups.find(subGrp => subGrp.name === environment)
    if (!group) {
      group = await kcClient.groups.setOrCreateChild({
        id: projectGroup.id,
      }, {
        name: environment,
      })
      await kcClient.groups.setOrCreateChild({ id: group.id }, { name: 'RO' })
      await kcClient.groups.setOrCreateChild({ id: group.id }, { name: 'RW' })
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
    const kcClient = await getkcClient()
    const { organization, project, environment } = payload.args
    const projectName = `${organization}-${project}`
    const projectGroupSearch = await kcClient.groups.find({ search: projectName })
    const projectGroup = projectGroupSearch?.find(grpRes => grpRes.name === projectName)
    if (!projectGroup) throw new Error('Impossible de retrouver le groupe keycloak du projet')
    const envGroup = projectGroup.subGroups?.find(subGrp => subGrp.name === environment)
    if (!envGroup) throw new Error('Impossible de retrouver le sous-groupe keycloak d\'environnement')
    await kcClient.groups.del({ id: envGroup.id })
    return {
      status: { result: 'OK', message: 'Deleted' },
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
