import { z } from 'zod'

const SecretValueSchema = z.union([
  z.string(),
  z.undefined().transform(() => ''),
  z.number().transform(String),
  z.bigint().transform(String),
  z.boolean().transform(String),
  z.null().transform(() => ''),
]).catch('')

export function parseSecretValue(value: string): string {
  return SecretValueSchema.parse(value)
}

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

export function generateGitlabTriggerTokenPath(projectRootDir: string, projectSlug: string) {
  return `${generateProjectPath(projectRootDir, projectSlug)}/GITLAB`
}
