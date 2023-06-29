import { sequelize } from '../../connect.js'
import { getRepositoryModel } from '../repository.js'

// SELECT
export const getRepositoryById = async (id) => {
  return getRepositoryModel().findByPk(id)
}

export const getProjectRepositories = async (projectId) => {
  return getRepositoryModel().findAll({
    raw: true,
    where: {
      projectId,
    },
  })
}

export const getInfraProjectRepositories = async (projectId) => {
  return getRepositoryModel().findAll({
    raw: true,
    where: {
      projectId,
      isInfra: true,
    },
  })
}
// CREATE
export const initializeRepository = async ({ projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName, externalToken }) => {
  return getRepositoryModel().create({
    projectId,
    internalRepoName,
    externalRepoUrl,
    externalUserName,
    externalToken: '',
    isInfra,
    isPrivate,
    status: 'initializing',
  })
}

// UPDATE
export const updateRepositoryCreated = async (id) => {
  return getRepositoryModel().update({ status: 'created' }, { where: { id } })
}

export const updateRepositoryFailed = async (id) => {
  return getRepositoryModel().update({ status: 'failed' }, { where: { id } })
}

export const updateRepository = async (id, data) => {
  return getRepositoryModel().update({
    ...data,
    status: 'initializing',
  }, {
    where: {
      id,
    },
  })
}

// DELETE
export const updateRepositoryDeleting = async (id) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return getRepositoryModel().update({
    status: 'deleting',
  }, {
    where: {
      id,
    },
  })
}

export const deleteRepository = async (id) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return getRepositoryModel().destroy({
    where: {
      id,
    },
  })
}

// TECH
export const _dropRepositoriesTable = async () => {
  await sequelize.drop({
    tableName: getRepositoryModel().tableName,
    force: true,
    cascade: true,
  })
}
