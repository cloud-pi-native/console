import { getStatus } from './check.js'
import { createUser, deleteUser } from './user.js'
import { initSonar } from './index.js'

export const init = (register) => {
  initSonar()
  getStatus()
  register('sonarqube', 'createProject', getStatus, 'check')
  register('sonarqube', 'createProject', createUser)
  register('sonarqube', 'archiveProject', getStatus, 'check')
  register('sonarqube', 'archiveProject', deleteUser)
}
