import { Environment, Organization, Project, RepositoryForEnv } from '@/plugins/hooks'
import { createHmac } from 'crypto'

export const generateAppProjectName = (org: Organization, proj: Project, env: Environment) => {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${envHash}`
}

export const generateApplicationName = (org: Organization, proj: Project, env: Environment, repo: RepositoryForEnv['internalRepoName']) => {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${repo}-${envHash}`
}
