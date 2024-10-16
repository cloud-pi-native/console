import { type Project, type StepCall, parseError } from '@cpn-console/hooks'

export const upsertProjectAppRole: StepCall<Project> = async (payload) => {
  try {
    if (!payload.apis.vault) {
      throw new Error('no Vault available')
    }
    await payload.apis.vault.upsertRole()
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
    if (!payload.apis.vault)
      throw new Error('no Vault available')
    await payload.apis.vault.destroyRole()
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
