import type { DefaultArgs, Plugin, Project, ProjectLite } from '@cpn-console/hooks'
import {
  deleteProject,
  deleteZone,
  retrieveKeycloakUserByEmail,
  upsertProject,
  upsertZone,
} from './functions.js'
import infos from './infos'
import monitor from './monitor'
import { start } from './client'
import { KeycloakProjectApi } from './class'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    deleteProject: {
      api: project => new KeycloakProjectApi(project.slug),
      steps: { post: deleteProject },
    },
    upsertProject: {
      api: project => new KeycloakProjectApi(project.slug),
      steps: { main: upsertProject },
    },
    upsertZone: {
      steps: { main: upsertZone },
    },
    deleteZone: {
      steps: { post: deleteZone },
    },
    retrieveUserByEmail: { steps: { main: retrieveKeycloakUserByEmail } },
  },
  monitor,
  start,
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    keycloak: Args extends (ProjectLite | Project)
      ? KeycloakProjectApi
      : undefined
  }
}
