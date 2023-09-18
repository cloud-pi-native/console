import { vaultUrl, vaultToken } from './utils.js'
import type { StepCall } from '@/plugins/hooks/hook.js'
import { destroyVault, listVault, readVault, writeVault } from './secret.js'
import type { DeleteRepositoryExecArgs, UpdateRepositoryExecArgs } from '@/plugins/hooks/repository.js'
import type { ArchiveProjectExecArgs } from '@/plugins/hooks/project.js'

export const axiosOptions = {
  baseURL: `${vaultUrl}`,
  headers: {
    'X-Vault-Token': vaultToken,
  },
}

export const writePayloadToVault = async (payload) => {
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

export const archiveDsoProject: StepCall<ArchiveProjectExecArgs> = async (payload) => {
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

export const updateRepository: StepCall<UpdateRepositoryExecArgs> = async (payload) => {
  const { internalRepoName, organization, project, externalToken, externalRepoUrl, externalUserName } = payload.args
  try {
    const vaultPath = [organization, project, `${internalRepoName}-mirror`].join('/')
    const vaultData = (await readVault(vaultPath)).data

    vaultData.GIT_INPUT_PASSWORD = externalToken
    vaultData.GIT_INPUT_USER = externalUserName
    vaultData.GIT_INPUT_URL = externalRepoUrl?.split(/:\/\/(.*)/s)[1] // Un urN ne contient pas le protocole

    await writeVault(vaultPath, vaultData)
    return {
      status: {
        result: 'OK',
        message: 'Updated',
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

export const deleteDsoRepository: StepCall<DeleteRepositoryExecArgs> = async (payload) => {
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

export const getRegistrySecret: StepCall<any> = async (payload) => {
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

export const getDsoProjectSecrets: StepCall<any> = async (payload) => {
  const { organization, project } = payload.args
  try {
    const buildVaultPath = (service: string) => [organization, project, service.toUpperCase()].join('/')

    // TODO déplacer les secrets dans un dossier pour tout lister plutôt que de sélectionner dans le code
    let gitlab
    try {
      gitlab = await readVault(buildVaultPath('gitlab'))
    } catch (error) {
      console.log('secret gitlab not found ...')
    }
    return {
      status: {
        result: 'OK',
      },
      result: {
        gitlab,
        // sonar: await readVault(buildVaultPath('sonar')),
        // harbor: await readVault(buildVaultPath('registry')),
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
