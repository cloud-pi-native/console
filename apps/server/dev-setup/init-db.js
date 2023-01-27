import { allOrganizations } from 'shared/src/utils/iterables.js'
import setupProjects from './setup-projects.js'
import setupUsers from './setup-users.js'
import { createOrganization } from '../src/models/queries/organization-queries.js'
import { dropTables, synchroniseModels } from '../src/connect.js'

export const initDb = async () => {
  await dropTables()
  await synchroniseModels()

  for (const org of allOrganizations) {
    await createOrganization(org)
  }

  await setupUsers()
  await setupProjects()
}
