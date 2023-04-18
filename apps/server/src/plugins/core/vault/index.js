import { vaultUrl, vaultToken } from '../../../utils/env.js'
import { destroyVault, listVault, readVault, writeVault } from './secret.js'

export const axiosOptions = {
  baseURL: `${vaultUrl}`,
  headers: {
    'X-Vault-Token': vaultToken,
  },
}

export const writePaylodToVault = async (payload) => {
  const { organization, project } = payload.args
  try {
    const promisesWrite = Object.values(payload).filter(({ vault }) => (Array.isArray(vault))).map(({ vault }) => {
      return vault.map(secret => {
        const vaultPath = [organization, project, secret.name].join('/')
        return writeVault(vaultPath, secret.data)
      })
    })
    const responses = await Promise.all(promisesWrite.flat())
    return {
      ...payload.vault,
      status: {
        result: 'OK',
      },
      recordsSaved: responses.length,
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

export const archiveDsoProject = async (payload) => {
  const { organization, project } = payload.args
  try {
    const vaultPath = [organization, project].join('/')
    const allSecrets = await listVault(vaultPath)
    const promisesDestroy = allSecrets.map(path => {
      return destroyVault(`${vaultPath}/${path}`)
    })
    await Promise.all(promisesDestroy)
    return {
      status: {
        result: 'OK',
      },
      secretsDestroyed: allSecrets.length,
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

export const deleteDsoRepository = async (payload) => {
  const { internalRepoName, organization, project } = payload.args
  try {
    const vaultPath = [organization, project, `${internalRepoName}-mirror`].join('/')
    await destroyVault(`${vaultPath}`)
    return {
      status: {
        result: 'OK',
        message: 'Deleted',
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

export const getRegistrySecret = async (payload) => {
  const { organization, project } = payload.args
  try {
    const vaultPath = [organization, project, 'REGISTRY'].join('/')

    return {
      status: {
        result: 'OK',
      },
      pullSecret: await readVault(vaultPath),
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
