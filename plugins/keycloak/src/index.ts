import type { Plugin } from '@cpn-console/hooks'
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

export { KeycloakProjectApi } from './class'
