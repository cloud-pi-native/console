import { RegisterFn } from '@/plugins/index.js'
import { createDsoProject, archiveDsoProject, getProjectSecrets, renewDsoProject } from './index.js'
import infos from './infos.js'

export const init = (register: RegisterFn) => {
  register(
    infos.name,
    {
      createProject: { post: createDsoProject },
      renewProjectTokens: { main: renewDsoProject },
      archiveProject: { main: archiveDsoProject },
      getProjectSecrets: { main: getProjectSecrets },
    },
  )
}
