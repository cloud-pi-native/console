import type { ProjectWithDetails } from './argocd-datastore.service'
import { ENABLED } from '@cpn-console/shared'
import { AUTO_SYNC_PLUGIN_KEY, PLUGIN_NAME, SUSPENDED_PLUGIN_KEY } from './argocd.constants'

export function isSuspended(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === PLUGIN_NAME && p.key === SUSPENDED_PLUGIN_KEY && p.value === ENABLED) ?? false
}

export function isAutoSync(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === PLUGIN_NAME && p.key === AUTO_SYNC_PLUGIN_KEY && p.value === ENABLED) ?? false
}
