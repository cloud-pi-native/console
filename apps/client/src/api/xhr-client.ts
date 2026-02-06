import { type ApiFetcherArgs, tsRestFetchApi } from '@ts-rest/core'
import { apiPrefix, getApiClient } from '@cpn-console/shared'
import { getKeycloak } from '@/utils/keycloak/keycloak.js'
// TODO: remove this comment
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
    const token = keycloak.token
    if (token) {
      args.headers.Authorization = `Bearer ${token}`
    }

    return tsRestFetchApi(args)
  },
)

export function extractData<T extends { status: number, body: unknown, headers: Headers }, S extends T['status']>(response: T, expectedStatus: S): Extract<T, { status: S }>['body'] {
  if (response.status === 401) {
    const keycloak = getKeycloak()
    if (!keycloak.authenticated) {
      keycloak.login()
    }
  }
  if (response.status >= 400) {
    // @ts-ignore
    throw new Error(response.body?.error ?? response.body?.message ?? 'Erreur inconnue')
  }
  if (response.status === expectedStatus) return response.body
  try {
    throw new Error(`Erreur lors de la requete, reçu ${response.status}, attendu ${expectedStatus}`)
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.stack)
    } else {
      console.log(error)
    }
    throw new Error('Erreur lors de la requete')
  }
}
