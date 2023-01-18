import { getUserProjects } from '../src/models/project-queries.js'
import { createUser } from '../src/models/users-queries.js'
import { createOrganization } from './../src/models/organization-queries.js'
import { projectInitialize, projectCreated, projectFailed, projectAddUser } from './../src/models/project-queries2.js'

export const initDb = async () => {
  await createOrganization('dinum')
  console.log('plop')
  await createUser({
    uuid: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
    email: 'test@test.com',
    organization: 'dinum',
    firstName: 'test',
    _lastName: 'com',
  })
  await createUser({
    uuid: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464',
    email: 'toto@test.com',
    organization: 'dinum',
    firstName: 'toto',
    _lastName: 'com',
  })
  await projectInitialize({ name: 'test-projet', organization: 'dinum', ownerUuid: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })
  await projectCreated({ name: 'test-projet', organization: 'dinum' })
  await projectInitialize({ name: 'failed-projet', organization: 'dinum', ownerUuid: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })
  await projectFailed({ name: 'failed-projet', organization: 'dinum' })
  await projectInitialize({ name: 'toto-projet', organization: 'dinum', ownerUuid: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464' })
  await projectCreated({ name: 'toto-projet', organization: 'dinum' })
  await projectAddUser({ name: 'toto-projet', organization: 'dinum', userUuid: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' })
  console.log(await getUserProjects('cb8e5b4b-7b7b-40f5-935f-594f48ae6565'))
}
