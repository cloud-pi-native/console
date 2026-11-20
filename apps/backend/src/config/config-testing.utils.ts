import { vi } from 'vitest'

// Stub every env key a config reads as undefined (removed) so the test
// runner's real environment cannot leak into a config parse. Tests then
// stub only the keys they exercise. Pair with vi.unstubAllEnvs() in afterEach.
export function resetEnvs(keys: readonly string[]): void {
  for (const key of keys) vi.stubEnv(key, undefined)
}
