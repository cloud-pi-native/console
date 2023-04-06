import { vaultUrl, vaultToken } from '../../../utils/env.js'
import { destroyVault, listVault, writeVault } from './secret.js'

export const axiosOptions = {
  baseURL: `${vaultUrl}`,
  headers: {
    'X-Vault-Token': vaultToken,
  },
}

export const writePaylodToVault = async (payload) => {
  const { organization, name } = payload.args
  try {
    const promisesWrite = Object.values(payload).filter(({ vault }) => (Array.isArray(vault))).map(({ vault }) => {
      return vault.map(secret => {
        const vaultPath = [organization, name, secret.name].join('/')
        return writeVault(vaultPath, secret.data)
      })
    })
    const responses = await Promise.all(promisesWrite.flat())
    return {
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
        error: JSON.stringify(error),
      },
    }
  }
}

export const archiveDsoProject = async (payload) => {
  const { organization, name } = payload.args
  try {
    const vaultPath = [organization, name].join('/')
    const allSecrets = await listVault(vaultPath)
    console.log(allSecrets)
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
        error: JSON.stringify(error),
      },
    }
  }
}
