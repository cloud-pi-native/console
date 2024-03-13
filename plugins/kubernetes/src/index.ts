import type { Plugin } from '@cpn-console/hooks'
import { createKubeSecret } from './secret.js'
import { createKubeNamespace, deleteKubeNamespace, updateResourceQuota } from './namespace.js'
import infos from './infos.js'
import { getProjectSecrets } from './misc.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    initializeEnvironment: {
      steps: {
        // check: checkInitializeEnvironment, // TODO implement check in controller
        main: createKubeNamespace,
        post: createKubeSecret,
      },
    },
    deleteEnvironment: { steps: { main: deleteKubeNamespace } },
    updateEnvironmentQuota: { steps: { main: updateResourceQuota } },
    getProjectSecrets: { steps: { main: getProjectSecrets } },
  },
}
