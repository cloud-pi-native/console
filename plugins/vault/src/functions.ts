import { type StepCall, type Project, parseError } from '@cpn-console/hooks'

export const archiveDsoProject: StepCall<Project> = async (payload) => {
  try {
    if (!payload.apis.vault) throw Error('no Vault available')
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
        message: error instanceof Error ? error.message : 'An unexpected error has occurred',
      },
    }
  }
}
