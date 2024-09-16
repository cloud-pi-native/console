import type { DefaultArgs, Plugin, Project, ProjectLite } from '@cpn-console/hooks'
import { KeycloakProjectApi } from './class.js'
import { start } from './client.js'
import {
  deleteProject,
  retrieveKeycloakAdminUsers,
  retrieveKeycloakUserByEmail,
  updateUserAdminKcGroupMembership,
  upsertProject,
} from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    deleteProject: {
      api: project => new KeycloakProjectApi(project.organization.name, project.name),
      steps: { post: deleteProject },
    },
    upsertProject: {
      api: project => new KeycloakProjectApi(project.organization.name, project.name),
      steps: { main: upsertProject },
    },
    retrieveUserByEmail: { steps: { main: retrieveKeycloakUserByEmail } },
    retrieveAdminUsers: { steps: { main: retrieveKeycloakAdminUsers } },
    updateUserAdminGroupMembership: { steps: { main: updateUserAdminKcGroupMembership } },
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
