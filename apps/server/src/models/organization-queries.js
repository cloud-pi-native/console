import { sequelize } from '../connect.js'
import { getOrganizationModel } from './models.js'
import { getUniq } from '../utils/queries-tools.js'

// SELECT
export const getOrganizations = async () => {
  return await getOrganizationModel().findAll()
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
  if (organization) throw Error('Cette organisation existe déjà')
  return await getOrganizationModel().create({ name, label })
}

// DROP
export const dropOrganizationsTable = async () => {
  await sequelize.drop({
    tableName: getOrganizationModel().tableName,
    force: true,
    cascade: true,
  })
}
