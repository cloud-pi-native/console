import { archiveDsoProject, writePaylodToVault, getRegistrySecret } from './index.js'

export const init = (register) => {
  register('vault', 'createProject', writePaylodToVault, 'save')
  register('vault', 'archiveProject', archiveDsoProject, 'save') // Function is not the same here, it destroys everything about project

  register('vault', 'createRepository', writePaylodToVault, 'save')
  register('vault', 'updateRepository', writePaylodToVault, 'save')
  register('vault', 'deleteRepository', writePaylodToVault, 'save')

  register('vault', 'addUserToProject', writePaylodToVault, 'save')
  register('vault', 'updateUserProjectRole', writePaylodToVault, 'save')
  register('vault', 'removeUserFromProject', writePaylodToVault, 'save')

  register('vault', 'initializeEnvironment', getRegistrySecret, 'pre') // Function is not the same here, it fetch registry secret

  register('vault', 'setPermission', writePaylodToVault, 'save')
  register('vault', 'updatePermission', writePaylodToVault, 'save')
  register('vault', 'deletePermission', writePaylodToVault, 'save')
}
