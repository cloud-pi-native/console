import type { DefaultArgs, Plugin, Project, ProjectLite } from '@cpn-console/hooks'
import { KeycloakProjectApi } from './class.ts'
import { start } from './client.ts'
import {
  deleteAdminRole,
  deleteProject,
  deleteProjectMember,
  deleteProjectRole,
  deleteZone,
  retrieveKeycloakUserByEmail,
  upsertAdminRole,
  upsertProject,
  upsertProjectMember,
  upsertProjectRole,
  upsertZone,
} from './functions.ts'
import infos from './infos.ts'
import monitor from './monitor.ts'

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
