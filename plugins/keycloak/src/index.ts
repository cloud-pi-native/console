import type { DefaultArgs, Plugin, Project, ProjectLite } from '@cpn-console/hooks'
import {
  deleteProject,
  deleteProjectRole,
  deleteZone,
  retrieveKeycloakUserByEmail,
  upsertProject,
  upsertProjectRole,
  upsertZone,
  upsertAdminRole,
  deleteAdminRole,
  upsertProjectMember,
  deleteProjectMember,
} from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { start } from './client.js'
import { KeycloakProjectApi } from './class.js'

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
    upsertProjectRole: {
      steps: { main: upsertProjectRole },
    },
    upsertProjectMember: {
      steps: { main: upsertProjectMember },
    },
    deleteProjectMember: {
      steps: { post: deleteProjectMember },
    },
    upsertZone: {
      steps: { main: upsertZone },
    },
    deleteZone: {
      steps: { post: deleteZone },
    },
    deleteProjectRole: {
      steps: { post: deleteProjectRole },
    },
    retrieveUserByEmail: { steps: { main: retrieveKeycloakUserByEmail } },
    upsertAdminRole: {
      steps: { main: upsertAdminRole },
    },
    deleteAdminRole: {
      steps: { post: deleteAdminRole },
    },
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
