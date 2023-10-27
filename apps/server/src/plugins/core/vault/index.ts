import type { StepCall } from '@/plugins/hooks/hook.js'
import type { ArchiveProjectExecArgs } from '@/plugins/hooks/index.js'

export const archiveDsoProject: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  try {
    if (!payload.vault) throw Error('no Vault available')
    const allSecrets = await payload.vault.list('/')
    const promisesDestroy = allSecrets.map(path => {
      return payload.vault.destroy(path)
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
