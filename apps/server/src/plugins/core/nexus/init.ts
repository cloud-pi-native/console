import type { RegisterFn } from '@/plugins/index.js'
import { createNexusProject, deleteNexusProject } from './project.js'
import { infos } from './infos.js'
import { purgeAll } from './purge.js'

export const init = (register: RegisterFn) => {
  register(
    'nexus',
    {
      createProject: { main: createNexusProject },
      archiveProject: { main: deleteNexusProject },
      purgeAll: { main: purgeAll },
    },
    infos,
  )
}
