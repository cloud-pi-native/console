import type { ProjectWithDetails } from './vault-datastore.service'
import { ENABLED } from '@cpn-console/shared'
import { AUTO_SYNC_PLUGIN_KEY, SUSPENDED_PLUGIN_KEY, VAULT_PLUGIN_NAME } from './vault.constant'

export function isSuspended(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === VAULT_PLUGIN_NAME && p.key === SUSPENDED_PLUGIN_KEY && p.value === ENABLED) ?? false
}

export function isAutoSync(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === VAULT_PLUGIN_NAME && p.key === AUTO_SYNC_PLUGIN_KEY && p.value === ENABLED) ?? false
}

export function generateProjectPath(projectRootDir: string | undefined, projectSlug: string) {
  return projectRootDir
    ? `${projectRootDir}/${projectSlug}`
    : projectSlug
}

export function generateGitlabMirrorCredPath(projectRootDir: string | undefined, projectSlug: string, repoName: string) {
  return projectRootDir
    ? `${generateProjectPath(projectRootDir, projectSlug)}/${repoName}-mirror`
    : `${projectSlug}/${repoName}-mirror`
}

export function generateTechReadOnlyCredPath(projectRootDir: string | undefined, projectSlug: string) {
  return projectRootDir
    ? `${generateProjectPath(projectRootDir, projectSlug)}/tech/GITLAB_MIRROR`
    : `${projectSlug}/tech/GITLAB_MIRROR`
}

export function generateSonarqubeCredPath(projectRootDir: string | undefined, projectSlug: string) {
  return projectRootDir
    ? `${generateProjectPath(projectRootDir, projectSlug)}/SONAR`
    : `${projectSlug}/SONAR`
}
