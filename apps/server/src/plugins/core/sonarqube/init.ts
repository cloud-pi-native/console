import { getStatus } from './check.js'
import { createUser, deleteUser } from './user.js'
import { initSonar } from './index.js'

export const init = (register) => {
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
