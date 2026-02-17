import { okStatus, parseError } from '@cpn-console/hooks'
import type {
  Project,
  ProjectLite,
  StepCall,
  ZoneObject,
} from '@cpn-console/hooks'

export const upsertProject: StepCall<Project> = async (payload) => {
  try {
    if (!payload.apis.vault) {
      throw new Error('no Vault available')
    }
    await payload.apis.vault.Project.upsert()
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}

export const archiveDsoProject: StepCall<Project> = async (payload) => {
  try {
    if (!payload.apis.vault) throw new Error('no Vault available')
    await payload.apis.vault.Project.delete()
    const allSecrets = await payload.apis.vault.list('/')
    const promisesDestroy = allSecrets.map((path) => {
      return payload.apis.vault.destroy(path)
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
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}

export const getSecrets: StepCall<ProjectLite> = async (payload) => {
  return {
    status: {
      result: 'OK',
    },
    secrets: {
      '.spec.mount': `${payload.args.slug}`,
      '.spec.vaultAuthRef': 'vault-auth',
    },
  }
}
export const upsertZone: StepCall<ZoneObject> = async (payload) => {
  try {
    if (!payload.apis.vault) {
      throw new Error('no Vault available')
    }
    await payload.apis.vault.upsert()
    return okStatus
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}
export const deleteZone: StepCall<ZoneObject> = async (payload) => {
  try {
    if (!payload.apis.vault) {
      throw new Error('no Vault available')
    }
    await payload.apis.vault.delete()
    return okStatus
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}
