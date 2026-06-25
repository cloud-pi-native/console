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
