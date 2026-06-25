import crypto, { createHmac } from 'node:crypto'

export function generateRandomPassword(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@-_#*'
  return Array.from(crypto.getRandomValues(new Uint32Array(length)), x => chars[x % chars.length])
    .join('')
}

// Must stay byte-for-byte identical to the legacy @cpn-console/hooks implementation:
// existing SonarQube project keys were generated with it, and ownership matching
// recomputes keys to decide which projects to reconcile or delete.
export function generateProjectKey(projectSlug: string, internalRepoName: string) {
  const repoHash = createHmac('sha256', '')
    .update(internalRepoName)
    .digest('hex')
    .slice(0, 4)
  return `${projectSlug}-${internalRepoName}-${repoHash}`
}
