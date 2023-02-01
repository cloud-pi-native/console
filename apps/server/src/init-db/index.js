import setupProjects from './setup-projects.js'
import setupUsers from './setup-users.js'
import { createOrganization } from '../models/queries/organization-queries.js'
import { dropTables, synchroniseModels } from '../connect.js'

export const initDb = async (data) => {
  await dropTables()
  await synchroniseModels()

  for (const org of data.organizations) {
    await createOrganization(org)
  }

  await setupUsers(data.users)
  await setupProjects(data.projects)
}
