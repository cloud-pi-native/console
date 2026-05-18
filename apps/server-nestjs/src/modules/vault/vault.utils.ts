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
