import type { DeclareModuleGenerator, Plugin } from '@cpn-console/hooks'
import {
  checkApi,
  deleteDsoProject,
  deleteProjectMember,
  deleteZone,
  getDsoProjectSecrets,
  syncRepository,
  upsertAdminRole,
  upsertDsoProject,
  upsertProjectMember,
  upsertZone,
} from './functions.js'
import infos from './infos.js'
import { logger } from './logger.js'
import monitor from './monitor.js'
import { getOrCreateGroupRoot } from './utils.js'

function start() {
  getOrCreateGroupRoot().catch((error) => {
    logger.error({ action: 'start', err: error }, 'Hook failed')
    throw new Error('Error at gitlab plugin start')
  })
}

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    deleteProject: {
      steps: {
        main: deleteDsoProject,
      },
    },
    upsertProject: {
      steps: {
        check: checkApi,
        main: upsertDsoProject,
      },
    },
    getProjectSecrets: { steps: { main: getDsoProjectSecrets } },
    syncRepository: {
      steps: {
        main: syncRepository,
      },
    },
    upsertCluster: {
      steps: {},
    },
    deleteCluster: {
      steps: {},
    },
    upsertZone: {
      steps: {
        pre: upsertZone,
      },
    },
    deleteZone: {
      steps: {
        main: deleteZone,
      },
    },
    upsertAdminRole: {
      steps: {
        main: upsertAdminRole,
      },
    },
    upsertProjectMember: {
      steps: {
        main: upsertProjectMember,
      },
    },
    deleteProjectMember: {
      steps: {
        post: deleteProjectMember,
      },
    },
  },
  monitor,
  start,
}

declare module '@cpn-console/hooks' {
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
  interface PluginResult {
    warnReasons?: string[]
  }
}
