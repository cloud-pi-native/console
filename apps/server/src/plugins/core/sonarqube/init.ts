import type { RegisterFn } from '@/plugins/index.js'
import { getStatus } from './check.js'
import { createUser, deleteUser } from './user.js'
import { createDsoProjectGroup, deleteteDsoProjectGroup } from './group.js'
import { initSonar } from './index.js'
import { createDsoRepository, deleteDsoRepository } from './project.js'
import infos from './infos.js'

export const init = (register: RegisterFn) => {
  initSonar()
  getStatus()
  register(
    infos.name,
    {
      createProject: {
        check: getStatus,
        pre: createUser,
        main: createDsoProjectGroup,
      },
      archiveProject: {
        check: getStatus,
        pre: deleteUser,
        main: deleteteDsoProjectGroup,
      },
      createRepository: {
        main: createDsoRepository,
      },
      deleteRepository: {
        main: deleteDsoRepository,
      },
    },
  )
}
