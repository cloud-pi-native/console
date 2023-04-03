import KcAdminClient from '@keycloak/keycloak-admin-client'

import {
  keycloakProtocol,
  keycloakDomain,
  keycloakRealm,
  keycloakUser,
  keycloakToken,
} from '../../../utils/env.js'
import { createGroups } from './group.js'
import { addMembers } from './permission.js'

const kcClient = new KcAdminClient({
  baseUrl: `${keycloakProtocol}://${keycloakDomain}`,
})

await kcClient.auth({
  clientId: 'admin-cli',
  grantType: 'password',
  username: keycloakUser,
  password: keycloakToken,
})
kcClient.setConfig({ realmName: keycloakRealm })

export { kcClient }

export const createProjectGroup = async (payload) => {
  const { organization, name, userId } = payload.args
  const projectName = `${organization}-${name}`
  const group = (await createGroups([projectName]))[0]
  await addMembers([userId], [projectName])
  console.log(group)
  const res = {
    status: { result: 'OK' },
    group: group[0],
  }
  return res
}
