import crypto, { createHmac } from 'node:crypto'
import { Organization, Project, RepositoryCreate } from '../hooks/index.js'

export const generateRandomPassword = (length = 24) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@-_#*'
  return Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map((x) => chars[x % chars.length])
    .join('')
}

export const generateProjectKey = (org: Organization, proj: Project, repo: RepositoryCreate['internalRepoName']) => {
  const repoHash = createHmac('sha256', '')
    .update(repo)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${repo}-${repoHash}`
}
