import { VaultError } from './vault-http-client.service'

export function generateProjectPath(projectRootDir: string, projectSlug: string) {
  return `${projectRootDir}/${projectSlug}`
}

export function generateGitlabMirrorCredPath(projectRootDir: string, projectSlug: string, repoName: string) {
  return `${generateProjectPath(projectRootDir, projectSlug)}/${repoName}-mirror`
}

export function generateTechReadOnlyCredPath(projectRootDir: string, projectSlug: string) {
  return `${generateProjectPath(projectRootDir, projectSlug)}/tech/GITLAB_MIRROR`
}

export function generateSonarqubeCredPath(projectRootDir: string, projectSlug: string) {
  return `${generateProjectPath(projectRootDir, projectSlug)}/SONAR`
}

export function generateSecretGroupPath(projectRootDir: string, projectSlug: string, group: string): string {
  return `${generateProjectPath(projectRootDir, projectSlug)}/${group}`
}

export function isVaultNotFound(error: unknown): error is VaultError {
  return error instanceof VaultError && error.kind === 'NotFound'
}

export function isVaultBadRequest(error: unknown): error is VaultError {
  return error instanceof VaultError && error.kind === 'HttpError' && error.status === 400
}

export function generateAppRoleSecretIdPath(projectRootDir: string, projectSlug: string) {
  return `${generateProjectPath(projectRootDir, projectSlug)}/APPROLE_SECRET_ID`
}
