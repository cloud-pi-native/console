import { type ApiFetcherArgs, tsRestFetchApi } from '@ts-rest/core'
import { apiPrefix, getApiClient } from '@cpn-console/shared'
import { getKeycloak } from '@/utils/keycloak/keycloak'

export const apiClient = await getApiClient(
  '',
  {},
  async (args: ApiFetcherArgs): Promise<{ status: number, body: { status: number, error: string } | unknown, headers: Headers }> => {
    // Paths that do not require token
    const validPaths = [`${apiPrefix}/version`, '/login', `${apiPrefix}/services`]
    if (validPaths.some(validPath => args.path?.startsWith(validPath))) {
      return tsRestFetchApi(args)
    }

    // Envs that do not require token
    if (process.env.NODE_ENV === 'test' && process.env.CT === 'true') {
      return tsRestFetchApi(args)
    }

    // Generate token
    const keycloak = getKeycloak()
    await keycloak.updateToken(120)
    const token = keycloak.token
    if (token) {
      args.headers.Authorization = `Bearer ${token}`
    }

    return tsRestFetchApi(args)
  },
)

export const extractData = <T extends { status: number, body: unknown, headers: Headers }, S extends T['status']> (
  response: T,
  expectedStatus: S,
): Extract<T, { status: S }>['body'] => {
  if (response.status >= 400 && response.status <= 599) {
    // @ts-ignore
    throw Error(response.body?.error ?? 'Erreur inconnue')
  }
  if (response.status === expectedStatus) return response.body
  try {
    throw Error(`Erreur lors de la requete, reçu ${response.status}, attendu ${expectedStatus}`)
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.stack)
    }
    else {
      console.log(error)
    }
    throw Error('Erreur lors de la requete')
  }
}
