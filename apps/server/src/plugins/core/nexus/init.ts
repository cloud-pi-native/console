import { createNexusProject, deleteNexusProject } from './project.js'

export const init = (register) => {
  register('nexus', 'createProject', createNexusProject)
  register('nexus', 'archiveProject', deleteNexusProject)
}
