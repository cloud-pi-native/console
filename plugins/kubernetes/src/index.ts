import type { Plugin } from '@cpn-console/hooks'
import infos from './infos'
import { getProjectSecrets } from './misc'
import { createNamespaces, deleteNamespaces } from './namespace'
import { KubernetesProjectApi } from './class'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: {
      api: args => new KubernetesProjectApi(args),
      steps: {
        pre: createNamespaces,
      },
    },
    deleteProject: {
      api: args => new KubernetesProjectApi(args),
      steps: {
        post: deleteNamespaces,
      },
    },
    getProjectSecrets: { steps: { main: getProjectSecrets } },
  },
}

export { KubernetesNamespace } from './class'
