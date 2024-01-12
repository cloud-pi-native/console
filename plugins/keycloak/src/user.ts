import KeycloakAdminClient from '@keycloak/keycloak-admin-client'

export const getUsers = async (kcClient: KeycloakAdminClient) => {
  return kcClient.users.find()
}

export const getUserByEmail = async (kcClient: KeycloakAdminClient, email: string) => {
  return (await kcClient.users.find({ email }))[0]
}
