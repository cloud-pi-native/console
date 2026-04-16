export function generateProjectPath(projectRootPath: string | undefined, projectSlug: string) {
  return projectRootPath
    ? `${projectRootPath}/${projectSlug}`
    : projectSlug
}

export function generateGitlabMirrorCredPath(projectRootPath: string | undefined, projectSlug: string, repoName: string) {
  return projectRootPath
    ? `${generateProjectPath(projectRootPath, projectSlug)}/${repoName}-mirror`
    : `${projectSlug}/${repoName}-mirror`
}

export function generateTechReadOnlyCredPath(projectRootPath: string | undefined, projectSlug: string) {
  return projectRootPath
    ? `${generateProjectPath(projectRootPath, projectSlug)}/tech/GITLAB_MIRROR`
    : `${projectSlug}/tech/GITLAB_MIRROR`
}
