import { parseError } from '@cpn-console/hooks'
import type { Project, ProjectLite, StepCall } from '@cpn-console/hooks'
import { generateVaultAuth, generateVsoSecret, generateVsoVaultConnection } from './vso.js'

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
    const kubeApi = payload.apis.kubernetes
    if (!payload.apis.vault) {
      throw new Error('no Vault available')
    }
    const appRoleCreds = await payload.apis.vault.Role.getCredentials()

    // loop on each env to verify if vault CRDs are installed on the cluster
    for (const ns of Object.values(kubeApi.namespaces)) {
      const apiVersions = await ns.apisApi?.getAPIVersions()
      const apiHashicorp = apiVersions?.body.groups.find(group => group.name === 'secrets.hashicorp.com')

      // verify if vault CRDs are installed on the cluster
      if (apiHashicorp) {
        const vaultConnectionObject = generateVsoVaultConnection(appRoleCreds)
        await ns.createOrPatchRessource({
          body: vaultConnectionObject,
          name: vaultConnectionObject.metadata.name,
          plural: 'vaultconnections',
          version: 'v1beta1',
          group: 'secrets.hashicorp.com',
        })

        const vaultSecretObject = generateVsoSecret(appRoleCreds)
        await ns.createOrPatchRessource({
          body: vaultSecretObject,
          name: vaultSecretObject.metadata.name,
          plural: 'secrets',
          version: 'v1',
          group: '',
        })

        const vaultAuthObject = generateVaultAuth(appRoleCreds)
        await ns.createOrPatchRessource({
          body: vaultAuthObject,
          name: vaultAuthObject.metadata.name,
          plural: 'vaultauths',
          version: 'v1beta1',
          group: 'secrets.hashicorp.com',
        })
      }
    }
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
      '.spec.mount': `${payload.args.organization.name}-${payload.args.name}`,
      '.spec.vaultAuthRef': 'vault-auth',
    },
  }
}
