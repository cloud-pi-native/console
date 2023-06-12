import { createKeycloakEnvGroup, createKeycloakProjectGroup, deleteKeycloakEnvGroup, deleteKeycloakProjectGroup } from './index.js'

export const init = (register) => {
  register('keycloak', 'createProject', createKeycloakProjectGroup)
  register('keycloak', 'archiveProject', deleteKeycloakProjectGroup)
  register('keycloak', 'initializeEnvironment', createKeycloakEnvGroup)
  register('keycloak', 'deleteEnvironment', deleteKeycloakEnvGroup)
}
