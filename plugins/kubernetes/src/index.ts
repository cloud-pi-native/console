import type { DefaultArgs, Plugin, Project } from '@cpn-console/hooks'
import { KubernetesProjectApi } from './class.js'
import infos from './infos.js'
import { getProjectSecrets } from './misc.js'
import { createNamespaces, deleteNamespaces } from './namespace.js'

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

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    kubernetes: Args extends (Project)
      ? KubernetesProjectApi<Args>
      : undefined
  }
}
