import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getRepositoryModel } from './models.js'

// SELECT
export const getRepositoryById = async (id) => {
  const res = await getRepositoryModel().findByPk(id)
  return res
}

export const getProjectRepositories = async (projectId) => {
  const res = await getRepositoryModel().findAll({
    where: {
      projectId: { [Op.eq]: projectId },
    },
  })
  return res
}

// CREATE
export const repositoryInitializing = async ({ projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName, externalToken }) => {
  const repos = await getProjectRepositories(projectId)
  const isInternalRepoNameTaken = repos.find(repo => repo.internalRepoName === internalRepoName)
  if (!isInternalRepoNameTaken) {
    const res = await getRepositoryModel().create({
      projectId,
      internalRepoName,
      externalRepoUrl,
      externalUserName,
      externalToken,
      isInfra,
      isPrivate,
      status: 'initializing',
    })
    return res
  }
  throw Error(`Le nom du dépôt interne ${internalRepoName} existe déjà en base pour ce projet`)
}

// UPDATE
export const repositoryCreated = async (repoId) => {
  const res = await getRepositoryModel().update({ status: 'created' }, { where: { id: repoId } })
  return res
}

export const repositoryFailed = async (repoId) => {
  const res = await getRepositoryModel().update({ status: 'failed' }, { where: { id: repoId } })
  return res
}

export const updateRepository = async (repoId, infos) => {
  const doesRepoExists = await getRepositoryById(repoId)
  if (doesRepoExists) {
    const res = await getRepositoryModel().update({
      ...infos,
      status: 'initializing',
    }, {
      where: {
        id: repoId,
      },
    })
    return res
  }
  throw Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
}

// DELETE

// TODO : requête delete

// DROP
export const dropRepositoriesTable = async () => {
  await sequelize.drop({
    tableName: getRepositoryModel().tableName,
    force: true,
    cascade: true,
  })
}
