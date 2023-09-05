import type { RegisterFn } from '@/plugins/index.js'
import { getStatus } from './check.js'
import { createUser, deleteUser } from './user.js'
import { createDsoProjectGroup, deleteDsoProjectGroup } from './group.js'
import { initSonar } from './index.js'
import { createDsoRepository, deleteDsoRepository } from './project.js'

export const init = (register: RegisterFn) => {
  initSonar()
  getStatus()
  register('sonarqube', {
    createProject: {
      check: getStatus,
      pre: createUser,
      main: createDsoProjectGroup,
    },
    archiveProject: {
      check: getStatus,
      pre: deleteUser,
      main: deleteDsoProjectGroup,
    },
    createRepository: {
      main: createDsoRepository,
    },
    deleteRepository: {
      main: deleteDsoRepository,
    },
  })
}
