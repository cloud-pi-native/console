import { sequelize } from '../connect.js'
import { getOrganizationModel } from './models.js'
import { getUniq } from '../utils/queries-tools.js'

// SELECT
export const getOrganizations = async () => {
  const res = await getOrganizationModel().findAll()
  return res
}

export const getOrganizationByName = async (name) => {
  const res = await getOrganizationModel().findAll({
    where: { name },
  })
  return getUniq(res)
}

// CREATE
export const createOrganization = async ({ name, label }) => {
  const organization = await getOrganizationByName(name)
  if (!organization) {
    const res = await getOrganizationModel().create({ name, label })
    return res
  }
  return organization
}

// DROP
export const dropOrganizationsTable = async () => {
  await sequelize.drop({
    tableName: getOrganizationModel().tableName,
    force: true,
    cascade: true,
  })
}
