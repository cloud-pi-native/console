import KcAdminClient from '@keycloak/keycloak-admin-client'
import getConfig from './config.js'
import { logger } from './logger.js'

export async function getkcClient() {
  const kcClient = new KcAdminClient({
    baseUrl: getConfig().url,
  })

  await kcClient.auth({
    clientId: 'admin-cli',
    grantType: 'password',
    username: process.env.KEYCLOAK_ADMIN,
    password: process.env.KEYCLOAK_ADMIN_PASSWORD,
  })
  kcClient.setConfig({ realmName: getConfig().realm })
  return kcClient
}

export function start() {
  getkcClient().catch((error) => {
    logger.error({ err: error }, 'Failed to start Keycloak plugin')
    if (process.env.IGNORE_PLUGINS_START_FAIL?.includes('keycloak')) {
      return
    }
    throw new Error('failed to start keycloak plugin')
  })
}
