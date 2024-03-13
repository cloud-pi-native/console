import type { StepCall, ArchiveProjectExecArgs } from '@cpn-console/hooks'

export const archiveDsoProject: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  try {
    if (!payload.apis.vault) throw Error('no Vault available')
    const allSecrets = await payload.apis.vault.list('/')
    const promisesDestroy = allSecrets.map(path => {
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
      status: {
        result: 'KO',
        message: error instanceof Error ? error.message : 'An unexpected error has occurred',
      },
      error: JSON.stringify(error),
    }
  }
}
