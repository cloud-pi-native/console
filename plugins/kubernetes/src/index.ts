import { Project, type Plugin, DefaultArgs } from '@cpn-console/hooks'
// import { createKubeSecret } from './secret.js'
// import { createKubeNamespace, deleteKubeNamespace, updateResourceQuota } from './namespace.js'
import infos from './infos.js'
import { getProjectSecrets } from './misc.js'
import { deleteNamespaces, createNamespaces } from './namespace.js'
import { KubernetesProjectApi } from './class.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: {
      api: (args) => new KubernetesProjectApi(args),
      steps: {
        pre: createNamespaces,
        // post: mettreCeQuiFautDedans,
      },
    },
    deleteProject: {
      api: (args) => new KubernetesProjectApi(args),
      steps: {
        post: deleteNamespaces,
      },
    },
    getProjectSecrets: { steps: { main: getProjectSecrets } },
  },
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    kubernetes: Args extends (Project)
    ? KubernetesProjectApi<Args>
    : undefined
  }
}
