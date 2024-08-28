import crypto, { createHmac } from 'node:crypto'
import type { Organization, Project } from '../hooks/index.js'

export function generateRandomPassword(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@-_#*'
  return Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map(x => chars[x % chars.length])
    .join('')
}

export function generateProjectKey(org: Organization, proj: Project['name'], repo: Project['repositories'][0]['internalRepoName']) {
  const repoHash = createHmac('sha256', '')
    .update(repo)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${repo}-${repoHash}`
}
