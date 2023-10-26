import { RegisterFn } from '@/plugins/index.js'
import { createDsoProject, archiveDsoProject, getProjectSecrets } from './index.js'
import infos from './infos.js'

export const init = (register: RegisterFn) => {
  register(
    infos.name,
    {
      createProject: { post: createDsoProject },
      archiveProject: { main: archiveDsoProject },
      getProjectSecrets: { main: getProjectSecrets },
    },
  )
}
