import type { RegisterFn } from '@/plugins/index.js'
import { createKubeSecret } from './secret.js'
import { createKubeNamespace, deleteKubeNamespace, updateResourceQuota } from './namespace.js'
import infos from './infos.js'
import { getProjectSecrets } from './misc.js'

export const init = (register: RegisterFn) => {
  register(infos.name, {
    initializeEnvironment: {
      // check: checkInitializeEnvironment, // TODO implement check in controller
      main: createKubeNamespace,
      post: createKubeSecret,
    },
    deleteEnvironment: {
      main: deleteKubeNamespace,
    },
    updateEnvironmentQuota: {
      main: updateResourceQuota,
    },
    getProjectSecrets: { main: getProjectSecrets },
  })
}
