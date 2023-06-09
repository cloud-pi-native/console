import { createNexusProject, deleteNexusProject } from './project.js'

export const init = (register) => {
  register('nexus', {
    createProject: { main: createNexusProject },
    archiveProject: { main: deleteNexusProject },
  })
}
