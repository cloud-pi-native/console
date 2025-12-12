import { services } from '@cpn-console/hooks'

export function checkServicesHealth() {
  return services.getStatus()
}

export async function refreshServicesHealth() {
  return Promise.all(services.refreshStatus())
}
