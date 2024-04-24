import { type ApiFetcherArgs, tsRestFetchApi } from '@ts-rest/core'
import { apiPrefix, getApiClient } from '@cpn-console/shared'
import { getKeycloak } from '@/utils/keycloak/keycloak'

export const apiClient = await getApiClient(
  '',
  {},
  async (args: ApiFetcherArgs): Promise<{ status: number; body: { status: number, error: string } | unknown; headers: Headers }> => {
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

    const res = await tsRestFetchApi(args)

    // Handle error
    if (res.status >= 400 || !res.status) {
      // @ts-expect-error
      throw new Error(res.body?.error ?? 'Erreur inconnue')
    }

    return res
  },
)
