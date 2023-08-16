import { RegisterFn } from '@/plugins/index.js'
import { archiveDsoProject, writePayloadToVault, getRegistrySecret, updateRepository, deleteDsoRepository } from './index.js'

export const init = (register: RegisterFn) => {
  register('vault', {
    all: { save: writePayloadToVault },
    archiveProject: { main: archiveDsoProject },
    updateRepository: { main: updateRepository },
    deleteRepository: { main: deleteDsoRepository },
    addEnvironmentCluster: { pre: getRegistrySecret },
  })
}
