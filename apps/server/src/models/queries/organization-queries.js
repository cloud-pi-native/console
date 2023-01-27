import { sequelize } from '../../connect.js'
import { getOrganizationModel } from '../organization.js'

// SELECT
export const getOrganizations = async () => {
  return await getOrganizationModel().findAll()
}

export const getOrganizationByName = async (name) => {
  return await getOrganizationModel().findAll({
    where: { name },
    limit: 1,
  })
}

// CREATE
export const createOrganization = async ({ name, label }) => {
  const organization = await getOrganizationByName(name)
  if (organization) throw new Error('Cette organisation existe déjà')
  return await getOrganizationModel().create({ name, label })
}

// TECH
export const _dropOrganizationsTable = async () => {
  await sequelize.drop({
    tableName: getOrganizationModel().tableName,
    force: true,
    cascade: true,
  })
}
