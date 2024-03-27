import type { Plugin } from '@cpn-console/hooks'
import { getStatus } from './check.js'
import { deleteProject, initSonar, setVariables, upsertProject } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'

export const start = (_options: unknown) => {
  initSonar()
  getStatus()
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
