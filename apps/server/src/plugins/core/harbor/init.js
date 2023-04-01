import { createDsoProject, archiveDsoProject } from './index.js'

export const init = (register) => {
  register('registry', 'createProject', createDsoProject)
  register('registry', 'archiveProject', archiveDsoProject)
}
