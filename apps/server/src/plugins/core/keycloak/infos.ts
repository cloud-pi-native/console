import { getMonitorObject, monitor } from '@/plugins/generic-monitor.js'
import type { ServiceInfos } from '@/plugins/services.js'
import { removeTrailingSlash } from '@dso-console/shared'

const lastMonitor = getMonitorObject()
export const keycloakUrl = removeTrailingSlash(process.env.KEYCLOAK_URL)

const infos: ServiceInfos = {
  monitor: (currentDate, force) => monitor(keycloakUrl, currentDate, force, lastMonitor),
  name: 'keycloak',
  title: 'Keycloak',
}

export default infos
