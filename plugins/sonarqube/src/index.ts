import type { Plugin } from '@dso-console/hooks'
import { getStatus } from './check.js'
import { createUser, deleteUser } from './user.js'
import { createDsoProjectGroup, deleteteDsoProjectGroup } from './group.js'
import { initSonar } from './functions.js'
import { createDsoRepository, deleteDsoRepository } from './project.js'
import infos from './infos.js'
import monitor from './monitor.js'

export const start = (_options: unknown) => {
  initSonar()
  getStatus()
}

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    createProject: {
      steps: {
        check: getStatus,
        pre: createUser,
        main: createDsoProjectGroup,
      },
    },
    archiveProject: {
      steps: {
        check: getStatus,
        pre: deleteUser,
        main: deleteteDsoProjectGroup,
      },
    },
    createRepository: { steps: { main: createDsoRepository } },
    deleteRepository: { steps: { main: deleteDsoRepository } },
  },
  start,
  monitor,
}

declare module '@dso-console/hooks' {
  interface HookPayloadResults {
    sonarqube: Record<string, any>
  }
}
