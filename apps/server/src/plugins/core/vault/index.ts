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

export const getDsoProjectSecrets: StepCall<any> = async (payload) => {
  try {
    if (!payload.vault) throw Error('no Vault available')
    // TODO déplacer les secrets dans un dossier pour tout lister plutôt que de sélectionner dans le code
    let gitlab
    try {
      gitlab = (await payload.vault.read('GITLAB')).data
      console.log(gitlab)
      console.log(await payload.vault.list('/'))
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
