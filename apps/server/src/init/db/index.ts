import setupProjects from '../db/setup-projects.js'
import setupUsers from '../db/setup-users.js'
import { _createOrganizations } from '../../queries/organization-queries.js'
import { dropTables } from '../../connect.js'

export const initDb = async (data) => {
  await dropTables()

  for (const org of data.organizations) {
    await _createOrganizations(org)
  }

  await setupUsers(data.users)
  await setupProjects(data.projects)
}
