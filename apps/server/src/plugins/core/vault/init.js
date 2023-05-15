import { archiveDsoProject, writePayloadToVault, getRegistrySecret, deleteDsoRepository } from './index.js'

export const init = (register) => {
  register('vault', 'createProject', writePayloadToVault, 'save')
  register('vault', 'archiveProject', archiveDsoProject) // Function is not the same here, it destroys everything about project

  register('vault', 'createRepository', writePayloadToVault, 'save')
  register('vault', 'updateRepository', writePayloadToVault, 'save')
  register('vault', 'deleteRepository', deleteDsoRepository) // Function is not the same here, it destroys the mirror repository secret

  register('vault', 'addUserToProject', writePayloadToVault, 'save')
  register('vault', 'updateUserProjectRole', writePayloadToVault, 'save')
  register('vault', 'removeUserFromProject', writePayloadToVault, 'save')

  register('vault', 'initializeEnvironment', getRegistrySecret, 'pre') // Function is not the same here, it fetch registry secret

  register('vault', 'setPermission', writePayloadToVault, 'save')
  register('vault', 'updatePermission', writePayloadToVault, 'save')
  register('vault', 'deletePermission', writePayloadToVault, 'save')
}
