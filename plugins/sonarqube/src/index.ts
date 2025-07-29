import type { HookStepsNames, Plugin } from '@cpn-console/hooks'
import { getStatus } from './check'
import { deleteProject, initSonar, setVariables, upsertProject } from './functions'
import infos from './infos'
import monitor from './monitor'

function start(_options: unknown) {
  try {
    initSonar()
    getStatus()
  } catch (_error) {}
}

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: {
      steps: {
        main: upsertProject,
        post: setVariables,
      },
    },
    deleteProject: {
      steps: {
        main: deleteProject,
      },
    },
  },
  start,
  monitor,
}

declare module '@cpn-console/hooks' {
  interface PluginResult {
    errors?: Partial<Record<HookStepsNames, unknown>>
  }
}
