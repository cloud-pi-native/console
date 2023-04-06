import { archiveDsoProject, writePaylodToVault } from './index.js'

export const init = (register) => {
  register('vault', 'createProject', writePaylodToVault, 'save')
  register('vault', 'archiveProject', archiveDsoProject, 'save') // Function is not the same here, it destroys everything about project

  register('vault', 'createRepository', writePaylodToVault, 'save')
  register('vault', 'updateRepository', writePaylodToVault, 'save')
  register('vault', 'deleteRepository', writePaylodToVault, 'save')

  register('vault', 'addUserToProject', writePaylodToVault, 'save')
  register('vault', 'updateUserProjectRole', writePaylodToVault, 'save')
  register('vault', 'removeUserFromProject', writePaylodToVault, 'save')

  register('vault', 'initializeEnvironment', writePaylodToVault, 'save')
  register('vault', 'deleteEnvironment', writePaylodToVault, 'save')

  register('vault', 'setPermission', writePaylodToVault, 'save')
  register('vault', 'updatePermission', writePaylodToVault, 'save')
  register('vault', 'deletePermission', writePaylodToVault, 'save')
}
