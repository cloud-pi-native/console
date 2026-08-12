/** HTTP status carried by errors such as keycloak-admin-client's NetworkError. */
export function getErrorResponseStatus(error: unknown): number | undefined {
  if (error instanceof Error && 'response' in error && error.response instanceof Response) {
    return error.response.status
  }
  return undefined
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
