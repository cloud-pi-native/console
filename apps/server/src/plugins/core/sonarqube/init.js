import { getStatus } from './check.js'
import { createUser, deleteUser } from './user.js'
import { initSonar } from './index.js'
import { purgeUsers } from './tech.js'

export const init = (register) => {
  initSonar()
  getStatus()
  purgeUsers()
  register('sonarqube', 'createProject', getStatus, 'check')
  register('sonarqube', 'createProject', createUser)
  register('sonarqube', 'archiveProject', getStatus, 'check')
  register('sonarqube', 'archiveProject', deleteUser)
}
