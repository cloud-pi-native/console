import type { RegisterFn } from '@/plugins/index.js'
import { createNexusProject, deleteNexusProject } from './project.js'
import infos from './infos.js'

export const init = (register: RegisterFn) => {
  register(
    infos.name,
    {
      createProject: { main: createNexusProject },
      archiveProject: { main: deleteNexusProject },
    },
  )
}
