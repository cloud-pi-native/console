import type { ProjectWithDetails } from './sonarqube-datastore.service'
import { ENABLED } from '@cpn-console/shared'
import { AUTO_SYNC_PLUGIN_KEY, SONARQUBE_PLUGIN_NAME, SUSPENDED_PLUGIN_KEY } from './sonarqube.constants'

export function sonarProjectPropertiesFile(projectKey: string) {
  return [
    `sonar.projectKey=${projectKey}`,
    'sonar.qualitygate.wait=true',
  ]
}

export function isSuspended(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === SONARQUBE_PLUGIN_NAME && p.key === SUSPENDED_PLUGIN_KEY && p.value === ENABLED) ?? false
}

export function isAutoSync(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === SONARQUBE_PLUGIN_NAME && p.key === AUTO_SYNC_PLUGIN_KEY && p.value === ENABLED) ?? false
}
