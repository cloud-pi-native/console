import k8sApi from './init.js'
import { getNsObject, getSecretObject } from './utils.js'

export const createKubeNamespace = async (payload) => {
  try {
    const { organization, project, environment } = payload.args
    const nsName = `${organization}-${project}-${environment}`
    const nsObject = getNsObject(organization, project, environment)
    const nsSearch = (await k8sApi.listNamespace()).body
    const ns = nsSearch.items.find(ns => ns.metadata.name === nsName)
    if (!ns) {
      const nsCreated = await k8sApi.createNamespace(nsObject)
      return {
        status: {
          result: 'OK',
          message: 'Created',
        },
        ns: nsCreated.body,
      }
    }
    const nsUpdated = await k8sApi.replaceNamespace(nsName, nsObject)
    return {
      status: {
        result: 'OK',
        message: 'Updated',
      },
      ns: nsUpdated.body,
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

export const deleteKubeNamespace = async (payload) => {
  try {
    const { organization, project, environment } = payload.args

    const nsName = `${organization}-${project}-${environment}`
    const nsSearch = (await k8sApi.listNamespace()).body
    const ns = nsSearch.items.find(ns => ns.metadata.name === nsName)
    if (ns) {
      await k8sApi.deleteNamespace(nsName)
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
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const createKubeSecret = async (payload) => {
  try {
    const { organization, project, environment, registryHost } = payload.args // TODO le registryHost devrait être stocké dans le vault secret pour assurer la cohérence entre identifiant et registry dans le temps
    const registrySecret = payload.vault.pullSecret.data
    const nsName = `${organization}-${project}-${environment}`
    const secret = getSecretObject(nsName, registrySecret, registryHost)
    k8sApi.createNamespacedSecret(nsName, secret)
    return {
      ...payload.kubernetes,
      status: {
        result: 'OK',
        message: 'Updated',
      },
    }
  } catch (error) {
    return {
      ...payload.kubernetes,
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}
