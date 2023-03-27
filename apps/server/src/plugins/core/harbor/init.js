import { archiveProject, createProject } from './project.js'

export const init = (register) => {
  register('registry', 'createProject', createProject)
  register('registry', 'archiveProject', archiveProject)
}
