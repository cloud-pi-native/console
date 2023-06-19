import { createDsoProject, archiveDsoProject } from './index.js'

export const init = (register) => {
  register('registry', {
    createProject: { post: createDsoProject },
    archiveProject: { main: archiveDsoProject },
  })
}
