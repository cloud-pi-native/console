import type { RegisterFn } from '@/plugins/index.js'
import { getStatus } from './check.js'
import { createUser, deleteDsoProject } from './user.js'
import { createDsoProjectGroup, deleteteDsoProjectGroup } from './group.js'
import { initSonar } from './index.js'
import { createDsoRepository, deleteDsoRepository } from './project.js'
import { infos } from './infos.js'
import { purgeAll } from './purge.js'

export const init = (register: RegisterFn) => {
  initSonar()
  getStatus()
  register(
    'sonarqube',
    {
      createProject: {
        check: getStatus,
        pre: createUser,
        main: createDsoProjectGroup,
      },
      archiveProject: {
        check: getStatus,
        pre: deleteDsoProject,
        main: deleteteDsoProjectGroup,
      },
      createRepository: {
        main: createDsoRepository,
      },
      deleteRepository: {
        main: deleteDsoRepository,
      },
      purgeAll: { main: purgeAll },
    },
    infos,
  )
}
