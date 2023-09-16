import { RegisterFn } from '@/plugins/index.js'
import { archiveDsoProject, writePayloadToVault, getRegistrySecret, updateRepository, deleteDsoRepository, getDsoProjectSecrets } from './index.js'
import { purgeAll } from './purge.js'

export const init = (register: RegisterFn) => {
  register('vault', {
    all: { save: writePayloadToVault },
    archiveProject: { main: archiveDsoProject },
    updateRepository: { main: updateRepository },
    deleteRepository: { main: deleteDsoRepository },
    addEnvironmentCluster: { pre: getRegistrySecret },
    getProjectSecrets: { main: getDsoProjectSecrets },
    purgeAll: { main: purgeAll },
  })
}
