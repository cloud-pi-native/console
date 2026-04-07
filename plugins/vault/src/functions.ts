import type {
  Project,
  ProjectLite,
  StepCall,
  ZoneObject,
} from '@cpn-console/hooks'
import { okStatus } from '@cpn-console/hooks'
import { logger } from './logger.js'

export const upsertProject: StepCall<Project> = async (payload) => {
  try {
    if (!payload.apis.vault) {
      throw new Error('no Vault available')
    }
    await payload.apis.vault.Project.upsert()
    logger.info({ action: 'upsertProject', projectSlug: payload.args.slug }, 'Hook done')
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    logger.error({ action: 'upsertProject', projectSlug: payload.args.slug, err: error }, 'Hook failed')
    return {
      error,
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

    logger.info({ action: 'archiveDsoProject', projectSlug: payload.args.slug, secretsDestroyed: allSecrets.length }, 'Hook done')
    return {
      status: {
        result: 'OK',
      },
      secretsDestroyed: allSecrets.length,
    }
  } catch (error) {
    logger.error({ action: 'archiveDsoProject', projectSlug: payload.args.slug, err: error }, 'Hook failed')
    return {
      error,
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}

export const getSecrets: StepCall<ProjectLite> = async (payload) => {
  logger.debug({ action: 'getSecrets', projectSlug: payload.args.slug }, 'Hook done')
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
    logger.info({ action: 'upsertZone', zoneSlug: payload.args.slug }, 'Hook done')
    return okStatus
  } catch (error) {
    logger.error({ action: 'upsertZone', zoneSlug: payload.args.slug, err: error }, 'Hook failed')
    return {
      error,
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
    logger.info({ action: 'deleteZone', zoneSlug: payload.args.slug }, 'Hook done')
    return okStatus
  } catch (error) {
    logger.error({ action: 'deleteZone', zoneSlug: payload.args.slug, err: error }, 'Hook failed')
    return {
      error,
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}
