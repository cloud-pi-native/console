import { RegisterFn } from '@/plugins/index.js'
import { createDsoProject, archiveDsoProject } from './index.js'
import { infos } from './infos.js'

export const init = (register: RegisterFn) => {
  register(
    'registry',
    {
      createProject: { post: createDsoProject },
      archiveProject: { main: archiveDsoProject },
    },
    infos,
  )
}
