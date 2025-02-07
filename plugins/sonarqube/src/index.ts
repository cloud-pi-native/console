import type { HookStepsNames, Plugin } from '@cpn-console/hooks'
import { getStatus } from './check.js'
import { deleteProject, initSonar, setVariables, upsertProject } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { startTracker } from './tracker.js'

function start(_options: unknown) {
  try {
    initSonar()
    getStatus()
    startTracker()
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
