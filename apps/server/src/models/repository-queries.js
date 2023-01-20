import { sequelize } from '../connect.js'
import { getRepositoryModel } from './models.js'

// SELECT
export const getRepositoryById = async (id) => {
  return await getRepositoryModel().findByPk(id)
}

export const getProjectRepositories = async (projectId) => {
  return await getRepositoryModel().findAll({
    raw: true,
    where: {
      projectId,
    },
  })
}

// CREATE
export const repositoryInitializing = async ({ projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName, externalToken }) => {
  const repos = await getProjectRepositories(projectId)
  const isInternalRepoNameTaken = repos.find(repo => repo.internalRepoName === internalRepoName)
  if (isInternalRepoNameTaken) throw Error(`Le nom du dépôt interne ${internalRepoName} existe déjà en base pour ce projet`)
  return await getRepositoryModel().create({
    projectId,
    internalRepoName,
    externalRepoUrl,
    externalUserName,
    externalToken,
    isInfra,
    isPrivate,
    status: 'initializing',
  })
}

// UPDATE
export const repositoryCreated = async (id) => {
  return await getRepositoryModel().update({ status: 'created' }, { where: { id } })
}

export const repositoryFailed = async (id) => {
  return await getRepositoryModel().update({ status: 'failed' }, { where: { id } })
}

export const updateRepository = async (id, infos) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return await getRepositoryModel().update({
    ...infos,
    status: 'initializing',
  }, {
    where: {
      id,
    },
  })
}

// DELETE
export const repositoryDeleting = async (id) => {
  const doesRepoExists = await getRepositoryById(id)
  if (!doesRepoExists) throw Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return await getRepositoryModel().update({
    status: 'deleting',
  }, {
    where: {
      id,
    },
  })
}

export const deleteRepository = async (id) => {
  const doesRepoExists = await getRepositoryById(id)
  if (!doesRepoExists) throw Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return await getRepositoryModel().destroy({
    where: {
      id,
    },
  })
}

// DROP
export const dropRepositoriesTable = async () => {
  await sequelize.drop({
    tableName: getRepositoryModel().tableName,
    force: true,
    cascade: true,
  })
}
