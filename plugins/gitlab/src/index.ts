import type { DeclareModuleGenerator, DefaultArgs, Plugin, Project, ProjectMember, UniqueRepo, ZoneObject } from '@cpn-console/hooks'
import { GitlabProjectApi, GitlabZoneApi } from './class.ts'
import {
  checkApi,
  commitFiles,
  deleteDsoProject,
  deleteProjectMember,
  deleteZone,
  getDsoProjectSecrets,
  syncRepository,
  upsertAdminRole,
  upsertDsoProject,
  upsertProjectMember,
  upsertZone,
} from './functions.ts'
import infos from './infos.ts'
import monitor from './monitor.ts'
import { getOrCreateGroupRoot } from './utils.ts'

const onlyApi = { api: (project: Project | UniqueRepo) => new GitlabProjectApi(project) }

function start() {
  getOrCreateGroupRoot().catch((error) => {
    console.log(error)
    throw new Error('Error at gitlab plugin start')
  })
}

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    deleteProject: {
      ...onlyApi,
      steps: {
        main: deleteDsoProject,
        post: commitFiles,
      },
    },
    upsertProject: {
      ...onlyApi,
      steps: {
        check: checkApi,
        main: upsertDsoProject,
        post: commitFiles,
      },
    },
    getProjectSecrets: { steps: { main: getDsoProjectSecrets } },
    syncRepository: {
      ...onlyApi,
      steps: {
        main: syncRepository,
        post: commitFiles,
      },
    },
    upsertCluster: {
      api: () => new GitlabZoneApi(),
      steps: {
        post: commitFiles,
      },
    },
    deleteCluster: {
      api: () => new GitlabZoneApi(),
      steps: {
        post: commitFiles,
      },
    },
    upsertZone: {
      api: () => new GitlabZoneApi(),
      steps: {
        pre: upsertZone,
        post: commitFiles,
      },
    },
    deleteZone: {
      api: () => new GitlabZoneApi(),
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
      api: member => new GitlabProjectApi(member.project),
      steps: {
        main: upsertProjectMember,
      },
    },
    deleteProjectMember: {
      api: member => new GitlabProjectApi(member.project),
      steps: {
        post: deleteProjectMember,
      },
    },
  },
  monitor,
  start,
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    gitlab: Args extends Project | UniqueRepo | ProjectMember['project']
      ? GitlabProjectApi
      : Args extends ZoneObject
        ? GitlabZoneApi
        : never
  }
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
  interface PluginResult {
    warnReasons?: string[]
  }
}
