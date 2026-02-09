import type { DeclareModuleGenerator, HookStepsNames, Plugin } from '@cpn-console/hooks'
import { getStatus } from './check.js'
import { deleteProject, initSonar, setVariables, upsertProject } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'

function start(options: unknown) {
  const config = (options as any)?.config?.sonarqube?.global
  try {
    initSonar(config)
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
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
}
