import type { HookStepsNames, Plugin } from '@cpn-console/hooks'
import { getStatus } from './check.ts'
import { deleteProject, initSonar, setVariables, upsertProject } from './functions.ts'
import infos from './infos.ts'
import monitor from './monitor.ts'

function start(_options: unknown) {
  try {
    initSonar()
    getStatus()
  } catch {}
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
