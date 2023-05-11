import { sequelize } from '../../connect.js'
import { getOrganizationModel } from '../organization.js'

// SELECT
export const getOrganizations = async () => {
  return getOrganizationModel().findAll()
}

export const getActiveOrganizations = async () => {
  return getOrganizationModel().findAll({
    where: { active: true },
  })
}

export const getOrganizationById = async (id) => {
  return getOrganizationModel().findByPk(id)
}

export const getOrganizationByName = async (name) => {
  const res = await getOrganizationModel().findAll({
    where: { name },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

// CREATE
export const createOrganization = async ({ name, label }) => {
  return getOrganizationModel().create({ name, label, active: true })
}

// UPDATE
export const updateActiveOrganization = async ({ name, active }) => {
  return getOrganizationModel().update({ active }, { where: { name } })
}

export const updateLabelOrganization = async ({ name, label }) => {
  return getOrganizationModel().update({ label }, { where: { name } })
}

// TECH
export const _dropOrganizationsTable = async () => {
  await sequelize.drop({
    tableName: getOrganizationModel().tableName,
    force: true,
    cascade: true,
  })
}
