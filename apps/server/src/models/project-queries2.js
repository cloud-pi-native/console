import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './models.js'
import { getUniq } from '../utils/queries-tools.js'

// SELECT
export const getUserProjects = async (userId) => {
  const res = await getProjectModel().findAll({
    raw: true,
    where: {
      [Op.or]: [
        { ownerId: userId },
        { usersId: { [Op.contains]: [userId] } },
      ],
    },
  })
  return res
}

export const getProjectById = async (id) => {
  return await getProjectModel().findByPk(id)
}

export const getProject = async ({ name, organization }) => {
  const res = await getProjectModel().findAll({
    raw: true,
    where: {
      name,
      organization,
    },
  })
  return getUniq(res)
}

// CREATE
export const projectInitializing = async ({ name, organization, ownerId }) => {
  const project = await getProject({ name, organization })
  if (project) throw Error('Un projet avec le nom et dans l\'organisation demandés existe déjà')
  const res = await getProjectModel().create({ name, organization, usersId: [ownerId], status: 'initializing', locked: true, ownerId })
  return res
}

// UPDATE

export const projectLocked = async (id) => {
  return await getProjectModel().update({ locked: true }, { where: { id } })
}

export const projectCreated = async ({ name, organization }) => {
  return await getProjectModel().update({ locked: false, status: 'created' }, { where: { name, organization } })
}

export const projectFailed = async ({ name, organization }) => {
  return await getProjectModel().update({ locked: false, status: 'failed' }, { where: { name, organization } })
}

export const projectAddUser = async ({ projectId, userId }) => {
  const project = await getProjectById(projectId)
  const users = project.usersId ?? [project.ownerId]
  if (users.includes(userId)) throw Error('Cet utilisateur est déjà membre du projet')
  return await getProjectModel().update({
    usersId: sequelize.fn('array_append', sequelize.col('usersId'), userId),
  }, {
    where: { id: projectId },
  })
}

// TODO : controller : suppression permissions associées
export const projectRemoveUser = async ({ projectId, userId }) => {
  const project = await getProjectById(projectId)
  const users = project.usersId ?? [project.ownerId]
  if (!users.includes(userId)) throw Error('Cet utilisateur n\'est pas membre du projet')
  return await getProjectModel().update({
    // usersId: sequelize.fn('array_append', sequelize.col('usersId'), userId),
    // TODO : retirer le userId de l'array
  }, {
    where: { id: projectId },
  })
}

export const projectArchiving = async (id) => {
  const project = await getProjectById(id)
  if (!project) throw Error('Projet non trouvé')
  return await getProjectModel().update({
    status: 'archived',
    locked: true,
  }, {
    where: { id },
  })
}

// DROP
export const dropProjectsTable = async () => {
  await sequelize.drop({
    tableName: getProjectModel().tableName,
    force: true,
    cascade: true,
  })
}

// DELETE / TRUNCATE
