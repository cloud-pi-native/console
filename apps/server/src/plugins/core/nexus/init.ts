import type { RegisterFn } from '@/plugins/index.js'
import { createNexusProject, deleteNexusProject } from './project.js'

export const init = (register: RegisterFn) => {
  register('nexus', {
    createProject: { main: createNexusProject },
    archiveProject: { main: deleteNexusProject },
  })
}
