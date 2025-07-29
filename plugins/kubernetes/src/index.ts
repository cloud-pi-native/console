import type { DefaultArgs, Plugin, Project } from '@cpn-console/hooks'
import infos from './infos'
import { getProjectSecrets } from './misc'
import { createNamespaces, deleteNamespaces } from './namespace'
import type { KubernetesNamespace } from './class'
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

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    kubernetes: Args extends (Project)
      ? KubernetesProjectApi<Args>
      : undefined
  }
  interface EnvironmentApis {
    kubernetes?: KubernetesNamespace
  }
}
