import { sequelize } from '../../connect.js'
import { getProjectModel } from '../project.js'
import { allDataAttributes, getUniq } from '../../utils/queries-tools.js'
import { getPermissionModel } from '../permission.js'
import { getEnvironmentModel } from '../environment.js'
import { getUserModel } from '../user.js'
import { getRepositoryModel } from '../repository.js'

// SELECT

export const projectGetUser = async ({ project, user }) => {
  return await user.hasProject(project)
}

// TODO : utiliser UsersProjects
export const getUserProjects = async (userId) => {
  const res = await getProjectModel().findAll({
    ...allDataAttributes,
    include: [
      {
        model: getEnvironmentModel(),
        include: {
          model: getPermissionModel(),
          include: {
            model: getUserModel(),
            attributes: { exclude: ['role'] },
          },
        },
        ...allDataAttributes,
      },
      {
        model: getUserModel(),
        attributes: { exclude: ['role'] },
        through: {
          where: {
            id: userId,
          },
        },
      },
      {
        model: getRepositoryModel(),
        ...allDataAttributes,
      },
    ],
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
export const projectInitializing = async ({ name, organization }) => {
  return await getProjectModel().create({ name, organization, status: 'initializing', locked: true })
}

// UPDATE
export const projectLocked = async (id) => {
  return await getProjectModel().update({ locked: true }, { where: { id } })
}

export const projectUnlocked = async (id) => {
  return await getProjectModel().update({ locked: false }, { where: { id } })
}

export const projectCreated = async (id) => {
  return await getProjectModel().update({ locked: false, status: 'created' }, { where: { id } })
}

export const projectFailed = async (id) => {
  return await getProjectModel().update({ locked: false, status: 'failed' }, { where: { id } })
}

export const projectAddUser = async ({ project, user, role }) => {
  return await user.addProject(project, { through: { role } })
}

export const projectRemoveUser = async ({ project, user }) => {
  return await user.removeProject(project)
}

export const projectArchiving = async (id) => {
  return await getProjectModel().update({
    status: 'archived',
    locked: true,
  }, {
    where: { id },
  })
}

// TECH
export const _projectInitializing = async ({ id, name, organization }) => {
  const project = await getProject({ name, organization })
  if (project) throw new Error('Un projet avec le nom et dans l\'organisation demandés existe déjà')
  return await getProjectModel().create({ id, name, organization, status: 'initializing', locked: true })
}

export const _dropProjectsTable = async () => {
  await sequelize.drop({
    tableName: getProjectModel().tableName,
    force: true,
    cascade: true,
  })
}
