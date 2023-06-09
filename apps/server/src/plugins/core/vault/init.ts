import { archiveDsoProject, writePayloadToVault, getRegistrySecret, deleteDsoRepository } from './index.js'

export const init = (register) => {
  register('vault', {
    all: { save: writePayloadToVault },
    archiveProject: { main: archiveDsoProject },
    deleteRepository: { main: deleteDsoRepository },
    initializeEnvironment: { pre: getRegistrySecret },
  })
}
