import { archiveDsoProject, writePayloadToVault, getRegistrySecret, updateRepository, deleteDsoRepository } from './index.js'

export const init = (register) => {
  register('vault', {
    all: { save: writePayloadToVault },
    archiveProject: { main: archiveDsoProject },
    updateRepository: { main: updateRepository },
    deleteRepository: { main: deleteDsoRepository },
    addEnvironmentCluster: { pre: getRegistrySecret },
  })
}
