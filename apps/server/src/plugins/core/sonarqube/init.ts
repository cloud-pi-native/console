import { getStatus } from './check.js'
import { createUser, deleteUser } from './user.js'
import { initSonar } from './index.js'
import type { RegisterFn } from '@/plugins/index.js'

export const init = (register: RegisterFn) => {
  initSonar()
  getStatus()
  register('sonarqube', {
    createProject: {
      check: getStatus,
      main: createUser,
    },
    archiveProject: {
      check: getStatus,
      main: deleteUser,
    },
  })
}
