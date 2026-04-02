import type {
  Project,
  ProjectLite,
  StepCall,
  ZoneObject,
} from '@cpn-console/hooks'
import { okStatus } from '@cpn-console/hooks'

export const upsertProject: StepCall<Project> = async (payload) => {
  if (!payload.apis.vault) {
    throw new Error('no Vault available')
  }
  await payload.apis.vault.Project.upsert()
  return {
    status: {
      result: 'OK',
    },
  }
}

export const archiveDsoProject: StepCall<Project> = async (payload) => {
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
  if (!payload.apis.vault) {
    throw new Error('no Vault available')
  }
  await payload.apis.vault.upsert()
  return okStatus
}
export const deleteZone: StepCall<ZoneObject> = async (payload) => {
  if (!payload.apis.vault) {
    throw new Error('no Vault available')
  }
  await payload.apis.vault.delete()
  return okStatus
}
