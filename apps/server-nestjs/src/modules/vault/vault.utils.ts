export function generateProjectPath(projectRootPath: string | undefined, projectSlug: string) {
  return projectRootPath
    ? `${projectRootPath}/${projectSlug}`
    : projectSlug
}
