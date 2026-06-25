/** HTTP status carried by errors such as keycloak-admin-client's NetworkError. */
export function getErrorResponseStatus(error: unknown): number | undefined {
  if (error instanceof Error && 'response' in error && error.response instanceof Response) {
    return error.response.status
  }
  return undefined
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
  return details
}
