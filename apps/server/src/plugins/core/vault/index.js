import { vaultUrl, vaultToken } from '../../../utils/env.js'
import { writeVault } from './secret.js'

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
