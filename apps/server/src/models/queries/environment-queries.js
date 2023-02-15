import { sequelize } from '../../connect.js'
import { getEnvironmentModel } from '../environment.js'
import { getProjectModel } from '../project.js'
import { getProjectById } from './project-queries.js'

// SELECT
export const getEnvironmentById = async (id) => {
  return getEnvironmentModel().findByPk(id)
}

export const getEnvironment = async ({ projectId, name }) => {
  const res = await getEnvironmentModel().findAll({
    where: { name, projectId },
    include: { model: getProjectModel() },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

export const getEnvironmentsByProjectId = async (projectId) => {
  return getEnvironmentModel().findAll({
    where: { projectId },
    include: { model: getProjectModel() },
  })
}

export const getEnvironmentsNamesByProjectId = async (projectId) => {
  return getEnvironmentModel().findAll({
    attributes: ['name'],
    where: { projectId },
    include: { model: getProjectModel() },
  })
}

export const getProjectByEnvironmentId = async (environmentId) => {
  const env = await getEnvironmentById(environmentId)
  return getProjectById(env.projectId)
}

// INSERT
export const initializeEnvironment = async ({ name, projectId }) => {
  return getEnvironmentModel().create(
    { name, projectId, status: 'initializing' }, {
      where: {
        name,
        projectId,
      },
      include: {
        model: getProjectModel(),
      },
    })
}

export const updateEnvironmentCreated = async (id) => {
  return getEnvironmentModel().update(
    {
      status: 'created',
    }, {
      where: {
        id,
      },
    })
}

export const updateEnvironmentFailed = async (id) => {
  return getEnvironmentModel().update(
    {
      status: 'failed',
    }, {
      where: {
        id,
      },
    })
}

// DELETE
export const updateEnvironmentDeleting = async (id) => {
  const doesEnvExist = await getEnvironmentById(id)
  if (!doesEnvExist) throw new Error('L\'environnement demandé n\'existe pas en base pour ce projet')
  return getEnvironmentModel().update({
    status: 'deleting',
  }, {
    where: {
      id,
    },
  })
}

export const deleteEnvironment = async (id) => {
  await getEnvironmentModel().destroy({
    where: {
      id,
    },
  })
}

// TECH
export const _dropEnvironmentsTable = async () => {
  await sequelize.drop({
    tableName: getEnvironmentModel().tableName,
    force: true,
    cascade: true,
  })
}
