import k8sApi from './init.js'
import { getNsObject, getSecretObject } from './utils.js'

const getNamespace = async (nsName) => {
  const nsSearch = (await k8sApi.listNamespace(undefined, undefined, undefined, `metadata.name=${nsName}`)).body
  return nsSearch.items.find(ns => ns.metadata.name === nsName)
}

// TODO implement check in controller
export const checkInitializeEnvironment = async (nsName) => {
  try {
    const ns = await getNamespace(nsName)
    if (!ns) {
      return { status: { result: 'OK', message: 'Namespace doesn\'t already exist' } }
    }
    if (ns?.status?.phase === 'Terminating') {
      return { status: { result: 'KO', message: 'Please try again later, namespace is still terminating, or contact your administrator' } }
    }
    return { status: { result: 'OK', message: 'Namespace already exists but it can be taken' } }
  } catch (error) {
    return { status: { result: 'KO', message: 'something went wrong' }, error: JSON.stringify(error) }
  }
}

export const createKubeNamespace = async (payload) => {
  try {
    const { organization, project, environment, owner } = payload.args
    const nsName = `${organization}-${project}-${environment}`
    const nsObject = getNsObject(organization, project, environment, owner)
    const ns = await getNamespace(nsName)
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
    const ns = await getNamespace(nsName)
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
    const secret = getSecretObject(nsName, registrySecret)
    await k8sApi.createNamespacedSecret(nsName, secret)
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
