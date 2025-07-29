import { okStatus, parseError } from '@cpn-console/hooks'
import type { Project, ProjectLite, StepCall, ZoneObject } from '@cpn-console/hooks'
import { generateVaultAuth, generateVsoSecret, generateVsoVaultConnection } from './vso'
import getConfig from './config'
import type { KubernetesNamespace } from '@cpn-console/kubernetes-plugin/types/class'

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
export const deployAuth: StepCall<Project> = async (payload) => {
  try {
    if (!payload.apis.vault) {
      throw new Error('no Vault available')
    }
    const appRoleCreds = await payload.apis.vault.Project.getCredentials()
    if (getConfig().disableVaultSecrets) {
      return okStatus
    }
    // loop on each env to verify if vault CRDs are installed on the cluster
    for (const env of payload.args.environments) {
      const nsKubeApi = env.apis.kubernetes as KubernetesNamespace
      const apiVersions = await nsKubeApi.apisApi?.getAPIVersions()
      const apiHashicorp = apiVersions?.body.groups.find(group => group.name === 'secrets.hashicorp.com')

      // verify if vault CRDs are installed on the cluster
      if (apiHashicorp) {
        const deployVaultConnectionInNs = getConfig().deployVaultConnectionInNs
        const vaultConnectionObject = generateVsoVaultConnection(appRoleCreds)
        if (deployVaultConnectionInNs) {
          await nsKubeApi.createOrPatchRessource({
            body: vaultConnectionObject,
            name: vaultConnectionObject.metadata.name,
            plural: 'vaultconnections',
            version: 'v1beta1',
            group: 'secrets.hashicorp.com',
          })
        } else {
          await nsKubeApi.deleteResource({
            name: vaultConnectionObject.metadata.name,
            plural: 'vaultconnections',
            version: 'v1beta1',
            group: 'secrets.hashicorp.com',
          })
        }

        const vaultSecretObject = generateVsoSecret(appRoleCreds)
        await nsKubeApi.createOrPatchRessource({
          body: vaultSecretObject,
          name: vaultSecretObject.metadata.name,
          plural: 'secrets',
          version: 'v1',
          group: '',
        })

        const vaultConnectionRef = deployVaultConnectionInNs
          ? vaultConnectionObject.metadata.name
          : null
        const vaultAuthObject = generateVaultAuth(appRoleCreds, vaultConnectionRef)
        await nsKubeApi.createOrPatchRessource({
          body: vaultAuthObject,
          name: vaultAuthObject.metadata.name,
          plural: 'vaultauths',
          version: 'v1beta1',
          group: 'secrets.hashicorp.com',
        })
      }
    }
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

export const archiveDsoProject: StepCall<Project> = async (payload) => {
  try {
    if (!payload.apis.vault)
      throw new Error('no Vault available')
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
