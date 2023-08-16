import type { RegisterFn } from '@/plugins/index.js'
import { createKubeSecret } from './secret.js'
import { createKubeNamespace, deleteKubeNamespace } from './namespace.js'

export const init = (register: RegisterFn) => {
  register('kubernetes', {
    addEnvironmentCluster: {
      // check: checkInitializeEnvironment, // TODO implement check in controller
      main: createKubeNamespace,
      post: createKubeSecret,
    },
    removeEnvironmentCluster: {
      main: deleteKubeNamespace,
    },
  })
}
