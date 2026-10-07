import crypto, { createHash, createHmac } from 'node:crypto'

export function generateRandomPassword(length = 24, chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@-_#*') {
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

const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
const TOKEN_LENGTH = 48

export interface TokenPair {
  // Plaintext token, returned to the caller once and never stored
  password: string
  // SHA-256 hex digest of the token (64 lowercase hex chars)
  hash: string
}

// Unsalting SHA-256 hex digest used to store and look up access tokens.
// Single source of truth for the token hash format: creation, auth lookup and
// tests must all go through it. Must stay byte-for-byte identical to the
// legacy @cpn-console/server implementation (unsalted `sha256(token)`).
export function hashToken(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// Generate a secure random access token and its SHA-256 storage hash.
// The plaintext token is shown to the caller exactly once; only the hash is
// persisted.
export function generateTokenPair(length: number = TOKEN_LENGTH): TokenPair {
  const password = generateRandomPassword(length, TOKEN_ALPHABET)
  return { password, hash: hashToken(password) }
}
