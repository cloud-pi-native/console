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
export const repositoryCreated = async (repoId) => {
  return await getRepositoryModel().update({ status: 'created' }, { where: { id: repoId } })
}

export const repositoryFailed = async (repoId) => {
  return await getRepositoryModel().update({ status: 'failed' }, { where: { id: repoId } })
}

export const updateRepository = async (repoId, infos) => {
  const doesRepoExist = await getRepositoryById(repoId)
  if (!doesRepoExist) throw Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return await getRepositoryModel().update({
    ...infos,
    status: 'initializing',
  }, {
    where: {
      id: repoId,
    },
  })
}

// DELETE
export const repositoryDeleting = async (repoId) => {
  const doesRepoExists = await getRepositoryById(repoId)
  if (!doesRepoExists) throw Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return await getRepositoryModel().update({
    status: 'deleting',
  }, {
    where: {
      id: repoId,
    },
  })
}

export const deleteRepository = async (repoId) => {
  const doesRepoExists = await getRepositoryById(repoId)
  if (!doesRepoExists) throw Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return await getRepositoryModel().destroy({
    where: {
      id: repoId,
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
