import { sequelize } from '../connect.js'
import { getOrganizationModel } from './project.js'

// SELECT
export const getOrganizations = async () => {
  const res = await getOrganizationModel().findAll()
  return res
}

export const getOrganizationByName = async (name) => {
  const res = await getOrganizationModel().findAll({
    where: { name },
  })
  return res
}

// CREATE
export const createOrganization = async (name) => {
  const organizations = await getOrganizationByName(name)
  if (!organizations.length) {
    const res = await getOrganizationModel().create({ name })
    return res
  }
  return organizations
}

// DROP
export const dropOrganizationsTable = async () => {
  await sequelize.drop({
    tableName: getOrganizationModel().tableName,
    force: true,
    cascade: true,
  })
}
