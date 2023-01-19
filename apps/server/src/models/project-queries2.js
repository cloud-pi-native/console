import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './models.js'
import { getUniq } from '../utils/queries-tools.js'

// SELECT
export const getUserProjects = async (userId) => {
  const res = await getProjectModel().findAll({
    where: {
      [Op.or]: [
        { ownerId: userId },
        { usersId: { [Op.contains]: [userId] } },
      ],
    },
  })
  return res
}

export const getProject = async ({ name, organization }) => {
  const res = await getProjectModel().findAll({
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
  if (!project) {
    const res = await getProjectModel().create({ name, organization, usersId: [ownerId], status: 'initializing', locked: true, ownerId })
    return res
  }
  return project
}

// UPDATE

// TODO : requête lockProject()

export const projectCreated = async ({ name, organization }) => {
  const res = await getProjectModel().update({ locked: false, status: 'created' }, { where: { name, organization } })
  return res
}

export const projectFailed = async ({ name, organization }) => {
  const res = await getProjectModel().update({ locked: false, status: 'failed' }, { where: { name, organization } })
  return res
}

export const projectAddUser = async ({ name, organization, userId }) => {
  const project = await getProject({ name, organization })
  const users = project.dataValues.usersId ?? [project.dataValues.ownerId]
  if (!users.includes(userId)) {
    await getProjectModel().update({
      usersId: sequelize.fn('array_append', sequelize.col('usersId'), userId),
    }, {
      where: { name, organization },
    })
  }
  return project
}

// TODO : requête removeUser

export const projectArchiving = async ({ name, organization }) => {
  const project = await getProject({ name, organization })
  if (project) {
    const res = await getProjectModel().update({
      status: 'archived',
      locked: true,
    }, {
      where: { name, organization },
    })
    return res
  }
  throw Error('Projet non trouvé')
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
