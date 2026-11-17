/** HTTP status carried by errors such as keycloak-admin-client's NetworkError. */
export function getErrorResponseStatus(error: unknown): number | undefined {
  if (error instanceof Error && 'response' in error && error.response instanceof Response) {
    return error.response.status
  }
  return undefined
}

/**
 * HTTP status of an error raised by any supported external client: gitbeaker
 * (cause.response), keycloak-admin-client (response), and the Nexus/SonarQube/
 * Vault HTTP clients (status).
 */
export function getErrorHttpResponseStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined
  if ('response' in error && error.response instanceof Response) return error.response.status
  if ('status' in error && typeof error.status === 'number') return error.status
  const cause: unknown = error.cause
  if (typeof cause === 'object' && cause !== null && 'response' in cause && cause.response instanceof Response) {
    return cause.response.status
  }
  return undefined
}

const transientHttpStatuses = new Set([429, 500, 502, 503, 504])

/** Whether an error is a transient upstream failure (rate limit or server error). */
export function isTransientHttpError(error: unknown): boolean {
  const status = getErrorHttpResponseStatus(error)
  return status !== undefined && transientHttpStatuses.has(status)
}

export interface TransientRetryOptions {
  attempts?: number
  waitMs?: (attempt: number) => number
  sleep?: (ms: number) => Promise<void>
  isTransient?: (error: unknown) => boolean
}

const defaultWaitMs = (attempt: number) => 500 * 2 ** (attempt - 1)

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * Runs `operation`, retrying while failures carry a transient HTTP status
 * (429/500/502/503/504, override with `isTransient`); any other error is
 * rethrown immediately. `attempts` is the total number of tries.
 */
export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  {
    attempts = 3,
    waitMs = defaultWaitMs,
    sleep: delay = sleep,
    isTransient = isTransientHttpError,
  }: TransientRetryOptions = {},
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= attempts || !isTransient(error)) throw error
      await delay(waitMs(attempt))
    }
  }
}

const urlCredentialsRegExp = /\/\/[^/:@\s]*:[^/@\s]*@/g

/** Strips `//user:password@` credentials that GitLab echoes back in remote urls. */
function maskUrlCredentials(value: string): string {
  return value.replaceAll(urlCredentialsRegExp, '//MASKED:MASKED@')
}

/** Normalizes an error description for logging. */
function normalizeDescription(description: unknown): unknown {
  if (typeof description === 'string') return maskUrlCredentials(description)
  try {
    return JSON.parse(maskUrlCredentials(JSON.stringify(description)))
  } catch {
    return maskUrlCredentials(String(description))
  }
}

/** HTTP details (status, url, response body) attached to errors carrying a fetch Response. */
export function getErrorHttpDetails(error: Error): Record<string, unknown> {
  const details: Record<string, unknown> = {}
  if ('response' in error && error.response instanceof Response) {
    details.status = error.response.status
    details.url = error.response.url
  }
  if ('responseData' in error && error.responseData !== undefined && error.responseData !== '') {
    details.responseData = error.responseData
  }

  const cause: unknown = error.cause
  if (typeof cause === 'object' && cause !== null) {
    if ('response' in cause && cause.response instanceof Response) {
      details.status = cause.response.status
      details.url = maskUrlCredentials(cause.response.url)
    }
    if ('request' in cause && cause.request instanceof Request) {
      details.method = cause.request.method
    }
    if ('description' in cause && cause.description !== undefined && cause.description !== '') {
      details.description = normalizeDescription(cause.description)
    }
  }

  return details
}
