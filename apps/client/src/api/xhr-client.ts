import type { ApiFetcherArgs } from '@ts-rest/core'
import { logger } from '@cpn-console/logger/browser'
import { apiPrefix, getApiClient } from '@cpn-console/shared'
import { tsRestFetchApi } from '@ts-rest/core'
import { getKeycloak } from '@/utils/keycloak/keycloak.js'

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

    const keycloak = getKeycloak()
    const attachTokenAndSend = async (): Promise<{ status: number, body: { status: number, error: string } | unknown, headers: Headers }> => {
      const token = keycloak.token
      if (token) {
        args.headers.Authorization = `Bearer ${token}`
      }
      return tsRestFetchApi(args)
    }

    try {
      // no-op si le token reste valide plus de 30 s ; rattrape le timer passif
      // `onTokenExpired`, throttlé quand l'onglet est en arrière-plan
      await keycloak.updateToken(30)
    } catch {
      // le 401 ci-dessous déclenche le retry, inutile d'échouer ici
    }

    let response = await attachTokenAndSend()
    if (response.status === 401 && keycloak.authenticated) {
      try {
        await keycloak.updateToken(-1)
      } catch {
        // on renvoie quand même, le 401 remontera à l'appelant
      }
      response = await attachTokenAndSend()
    }
    return response
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
    // `message` d'abord : les erreurs gérées du legacy (ErrorResType) et celles de NestJS
    // (HttpException) portent le vrai message dans `message` — chez NestJS, `error` ne contient
    // que la raison HTTP générique ("Forbidden", "Bad Request"). `error` reste en repli pour
    // les erreurs non gérées du legacy (setErrorHandler), qui n'ont pas de champ `message`.
    // @ts-ignore
    throw new Error(response.body?.message ?? response.body?.error ?? 'Erreur inconnue')
  }
  if (response.status === expectedStatus) return response.body
  try {
    throw new Error(`Erreur lors de la requete, reçu ${response.status}, attendu ${expectedStatus}`)
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error({ err: error }, 'Request failed')
    }
    throw error
  }
}
