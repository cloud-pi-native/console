import type { ServiceInfos } from '@/plugins/services.js'
import { removeTrailingSlash } from '@dso-console/shared'

export const keycloakUrl = removeTrailingSlash(process.env.KEYCLOAK_URL)

export const infos: ServiceInfos = {
  monitorUrl: `${keycloakUrl}`,
  name: 'keycloak',
  title: 'Keycloak',
}
