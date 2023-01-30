import { sequelize } from '../../connect.js'
// import { Op } from 'sequelize'
import { getProjectModel } from '../project.js'
import { dbKeysExcluded } from '../../utils/queries-tools.js'
import { getPermissionModel } from '../permission.js'
import { getEnvironmentModel } from '../environment.js'
import { getRepositoryModel } from '../repository.js'
import { getUserModel } from '../user.js'

// SELECT
export const getProjectUsers = async (projectId) => {
  const res = await getProjectModel().findAll({
    where: { id: projectId },
    include: {
      model: getUserModel(),
      attributes: { exclude: ['role'] },
    },
  })
  return res
}

export const getUserProjects = async (user) => {
  const res = await user.getProjects({
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
        // TODO: faire une repasse sur le nom des models / cles utilisees et verifier le besoin de ce code commente
        // through: {
        //   where: {
        //     UserId: user.id,
        //   },
        // },
      },
      {
        model: getRepositoryModel(),
        ...dbKeysExcluded,
      },
    ],
  })
  return res
}

// column Users->UsersProjects.id does not exist

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
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

// CREATE
export const initializeProject = async ({ name, organization }) => {
  return await getProjectModel().create({ name, organization, status: 'initializing', locked: true })
}

// UPDATE
export const lockProject = async (id) => {
  return await getProjectModel().update({ locked: true }, { where: { id } })
}

export const unlockProject = async (id) => {
  return await getProjectModel().update({ locked: false }, { where: { id } })
}

export const updateProjectCreated = async (id) => {
  return await getProjectModel().update({ locked: false, status: 'created' }, { where: { id } })
}

export const updateProjectFailed = async (id) => {
  return await getProjectModel().update({ locked: false, status: 'failed' }, { where: { id } })
}

export const addUserToProject = async ({ project, user, role }) => {
  return await user.addProject(project, { through: { role } })
}

export const removeUserFromProject = async ({ project, user }) => {
  return await user.removeProject(project)
}

export const archiveProject = async (id) => {
  return await getProjectModel().update({
    status: 'archived',
    locked: true,
  }, {
    where: { id },
  })
}

// TECH
export const _initializeProject = async ({ id, name, organization }) => {
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
