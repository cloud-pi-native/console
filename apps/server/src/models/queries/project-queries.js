import { sequelize } from '../../connect.js'
import { getProjectModel } from '../project.js'
import { dbKeysExcluded } from '../../utils/queries-tools.js'
import { getPermissionModel } from '../permission.js'
import { getEnvironmentModel } from '../environment.js'
import { getRepositoryModel } from '../repository.js'
import { getUserModel } from '../user.js'
import { getOrganizationModel } from '../organization.js'

// SELECT
export const getProjectUsers = async (projectId) => {
  const res = await getUserModel().findAll({
    include: {
      model: getProjectModel(),
      where: { id: projectId },
      attributes: { exclude: ['role'] },
    },
  })
  return res
}

export const getUserProjects = async (user) => {
  const res = await user?.getProjects({
    ...dbKeysExcluded,
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
        ...dbKeysExcluded,
      },
      {
        model: getUserModel(),
        attributes: { exclude: ['role'] },
      },
      {
        model: getRepositoryModel(),
        ...dbKeysExcluded,
      },
      {
        model: getOrganizationModel(),
        ...dbKeysExcluded,
      },
    ],
  })
  return res
}

export const getProjectById = async (id) => {
  return getProjectModel().findByPk(id)
}

export const getProject = async ({ name, organization }) => {
  const res = await getProjectModel().findAll({
    raw: true,
    where: {
      name,
      organization,
    },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

// CREATE
export const initializeProject = async ({ name, organization }) => {
  return getProjectModel().create({ name, organization, status: 'initializing', locked: true })
}

// UPDATE
export const lockProject = async (id) => {
  return getProjectModel().update({ locked: true }, { where: { id } })
}

export const unlockProject = async (id) => {
  return getProjectModel().update({ locked: false }, { where: { id } })
}

export const updateProjectCreated = async (id) => {
  return getProjectModel().update({ locked: false, status: 'created' }, { where: { id } })
}

export const updateProjectFailed = async (id) => {
  return getProjectModel().update({ locked: false, status: 'failed' }, { where: { id } })
}

export const addUserToProject = async ({ project, user, role }) => {
  return user.addProject(project, { through: { role } })
}

export const removeUserFromProject = async ({ project, user }) => {
  return user.removeProject(project)
}

export const archiveProject = async (id) => {
  return getProjectModel().update({
    status: 'archived',
    locked: true,
  }, {
    where: { id },
  })
}

// TECH
export const _initializeProject = async ({ id, name, organization }) => {
  return getProjectModel().create({ id, name, organization, status: 'initializing', locked: true })
}

export const _dropProjectsTable = async () => {
  await sequelize.drop({
    tableName: getProjectModel().tableName,
    force: true,
    cascade: true,
  })
}
