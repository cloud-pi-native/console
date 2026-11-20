import { HttpStatus } from '@nestjs/common'
import { SonarqubeError } from './sonarqube-http-client.service'

export function sonarProjectPropertiesFile(projectKey: string) {
  return [
    `sonar.projectKey=${projectKey}`,
    'sonar.qualitygate.wait=true',
  ]
}

// Whether a SonarQube error signals an entity already existing (race
// collision): a 409, or a 4xx whose message mentions "already"/"exists"
// (SonarQube reports some collisions as a generic Bad Request).
export function isSonarqubeAlreadyExists(error: unknown): error is SonarqubeError {
  if (!(error instanceof SonarqubeError)) return false
  if (error.status === HttpStatus.CONFLICT) return true
  return error.status !== undefined && error.status >= 400 && error.status < 500 && /already|exists/i.test(error.message)
}

// Runs an idempotent write: tries `create`, and on a SonarQube race collision
// reloads via `reload` and returns the existing entity instead of failing.
// `onCollision` is invoked once when a collision is detected. If the reload
// finds nothing, the original error is rethrown so genuine failures are not
// swallowed.
export async function ensure<T>({
  create,
  reload,
  onCollision,
}: {
  create: () => Promise<T>
  reload: () => Promise<T | undefined>
  onCollision?: (error: unknown) => void
}): Promise<T> {
  try {
    return await create()
  } catch (error) {
    if (isSonarqubeAlreadyExists(error)) {
      onCollision?.(error)
      const existing = await reload()
      if (existing) return existing
    }
    throw error
  }
}
