import KcAdminClient from '@keycloak/keycloak-admin-client'

import {
  keycloakProtocol,
  keycloakDomain,
  keycloakRealm,
  keycloakUser,
  keycloakToken,
} from '../../../utils/env.js'
import { addMembers } from './permission.js'

const kcClient = new KcAdminClient({
  baseUrl: `${keycloakProtocol}://${keycloakDomain}`,
})

await kcClient.auth({
  clientId: 'admin-cli',
  grantType: 'password',
  username: keycloakUser,
  password: keycloakToken,
})
kcClient.setConfig({ realmName: keycloakRealm })

export { kcClient }

export const createKeycloakProjectGroup = async (payload) => {
  try {
    const { organization, project, userId } = payload.args
    const projectName = `${organization}-${project}`
    const group = await kcClient.groups.create({
      name: projectName,
    })
    await addMembers([userId], [projectName])
    console.log(group)
    const res = {
      status: { result: 'OK' },
      group: group[0],
    }
    return res
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
  return {
    status: { result: 'OK' },
  }
}

export const createKeycloakEnvGroup = async (payload) => {
  try {
    const { organization, project, environment } = payload.args
    const projectName = `${organization}-${project}`
    const projectGroup = (await kcClient.groups.find({ search: projectName })).find(grpRes => grpRes.name === projectName)
    const envGroup = projectGroup.subGroups.find(subGrp => subGrp.name === environment)
    if (!envGroup) {
      const group = await kcClient.groups.setOrCreateChild({
        id: projectGroup.id,
      }, {
        name: environment,
      })
      await kcClient.groups.setOrCreateChild({ id: group.id }, { name: 'RO' })
      await kcClient.groups.setOrCreateChild({ id: group.id }, { name: 'RW' })
      return {
        status: { result: 'OK' },
        group,
      }
    }
    return {
      status: { result: 'Already Exists' },
      group: envGroup,
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
    const { organization, project, environment } = payload.args
    const projectName = `${organization}-${project}`
    const projectGroup = (await kcClient.groups.find({ search: projectName })).find(grpRes => grpRes.name === projectName)
    console.log(projectGroup)
    const envGroup = projectGroup.subGroups.find(subGrp => subGrp.name === environment)
    if (envGroup) {
      await kcClient.groups.del({ id: envGroup.id })
    }
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
