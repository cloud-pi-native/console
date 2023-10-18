import type { RegisterFn } from '@/plugins/index.js'
import { createKubeSecret } from './secret.js'
import { createKubeNamespace, deleteKubeNamespace, updateResourceQuota } from './namespace.js'

export const init = (register: RegisterFn) => {
  register('kubernetes', {
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
  })
}
