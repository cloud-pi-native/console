import crypto, { createHash, createHmac, timingSafeEqual } from 'node:crypto'

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
  /** Plaintext token. Returned to the caller once and never stored. */
  password: string
  /** SHA-256 hex digest of the token (64 lowercase hex chars). */
  hash: string
}

/**
 * Generate a secure random access token and its SHA-256 storage hash.
 * The plaintext token is shown to the caller exactly once; only the hash is
 * persisted. This keeps the storage format compatible with the Fastify server
 * (unsalted `sha256(token)` hex digest).
 */
export async function generateTokenPair(length: number = TOKEN_LENGTH): Promise<TokenPair> {
  const password = generateRandomPassword(length, TOKEN_ALPHABET)
  const hash = createHash('sha256').update(password).digest('hex')
  return { password, hash }
}

/**
 * Verify a plaintext token against a stored SHA-256 hex hash
 * (64 lowercase hex chars, unsalted — the format shared with the Fastify server).
 * Uses a constant-time comparison to avoid timing leaks.
 */
export async function verifyTokenHash(token: string, storedHash: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(storedHash)) return false

  const expected = Buffer.from(storedHash, 'hex')
  const derived = createHash('sha256').update(token).digest()
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}
