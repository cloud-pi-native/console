import type { ProjectWithDetails } from './argocd-datastore.service'
import { ENABLED } from '@cpn-console/shared'
import { ARGOCD_PLUGIN_NAME, AUTO_SYNC_PLUGIN_KEY, SUSPENDED_PLUGIN_KEY } from './argocd.constant'

export function isSuspended(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === ARGOCD_PLUGIN_NAME && p.key === SUSPENDED_PLUGIN_KEY && p.value === ENABLED) ?? false
}

export function isAutoSync(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === ARGOCD_PLUGIN_NAME && p.key === AUTO_SYNC_PLUGIN_KEY && p.value === ENABLED) ?? false
}
