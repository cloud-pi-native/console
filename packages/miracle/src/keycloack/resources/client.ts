import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js'
import type { Resource as AlchemyResource, Context } from 'alchemy'
import { Resource, Secret } from 'alchemy'
import { getKeycloakClient } from '../keycloak-client.js'

export type KeycloakOidcClientProps = Omit<Partial<ClientRepresentation>, 'clientId' | 'secret'> & {
  clientId: string
  secret?: string | Secret<string>
  present?: boolean
}

export interface KeycloakOidcClientResource extends AlchemyResource<'cpn::keycloack::OidcClient'> {
  id: string
  clientId: string
}

export const KeycloakOidcClient = Resource(
  'cpn::keycloack::OidcClient',
  async function (this: Context<KeycloakOidcClientResource>, _id: string, props: KeycloakOidcClientProps) {
    const kcClient = await getKeycloakClient()

    if (this.phase === 'delete' || props.present === false) {
      const existing = await findClientByClientId(props.clientId)
      if (existing?.id) {
        await kcClient.clients.del({ id: existing.id }).catch((error: any) => {
          if (isNotFoundError(error)) return
          throw error
        })
      }
      return this.destroy()
    }

    if (this.phase === 'update' && this.output?.clientId !== props.clientId) {
      this.replace()
    }

    const existing = await findClientByClientId(props.clientId)
    if (existing?.id) {
      const { secret, ...updatePayload } = props
      await kcClient.clients.update({ id: existing.id }, updatePayload)
      return { id: existing.id, clientId: props.clientId }
    }

    if (!props.secret) {
      throw new Error(`Missing "secret" when creating Keycloak client: ${props.clientId}`)
    }
    const secret = Secret.unwrap(props.secret)

    const created = await kcClient.clients.create({
      ...props,
      secret,
    })

    if (!created.id) {
      const createdAgain = await findClientByClientId(props.clientId)
      if (!createdAgain?.id) {
        throw new Error(`Failed to retrieve created Keycloak client: ${props.clientId}`)
      }
      return { id: createdAgain.id, clientId: props.clientId }
    }
    return { id: created.id, clientId: props.clientId }
  },
)

async function findClientByClientId(clientId: string): Promise<ClientRepresentation | undefined> {
  const kcClient = await getKeycloakClient()
  const result: ClientRepresentation[] = await kcClient.clients.find({ clientId, max: 1 })
  return result[0]
}

function isNotFoundError(error: unknown): boolean {
  const anyError = error as any
  return anyError?.response?.status === 404 || anyError?.status === 404 || anyError?.statusCode === 404
}
