import { sequelize } from '../../connect.js'
import { getEnvironmentModel } from '../environment.js'
import { getProjectModel } from '../project.js'
import { getProjectById } from './project-queries.js'

// SELECT
export const getEnvironmentById = async (id) => {
  return await getEnvironmentModel().findByPk(id)
}

export const getEnvironment = async ({ projectId, name }) => {
  return await getEnvironmentModel().findAll({
    where: { name, projectId },
    include: { model: getProjectModel() },
    limit: 1,
  })
}

export const getEnvironmentsByProjectId = async (projectId) => {
  return await getEnvironmentModel().findAll({
    where: { projectId },
    include: { model: getProjectModel() },
  })
}

export const getEnvironmentsNamesByProjectId = async (projectId) => {
  return await getEnvironmentModel().findAll({
    attributes: ['name'],
    where: { projectId },
    include: { model: getProjectModel() },
  })
}

export const getProjectByEnvironmentId = async (environmentId) => {
  const env = await getEnvironmentById(environmentId)
  return await getProjectById(env.projectId)
}

// INSERT
export const environmentInitializing = async ({ name, projectId }) => {
  return await getEnvironmentModel().create(
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

export const environmentCreated = async (id) => {
  return await getEnvironmentModel().update(
    {
      status: 'created',
    }, {
      where: {
        id,
      },
    })
}

export const environmentFailed = async (id) => {
  return await getEnvironmentModel().update(
    {
      status: 'failed',
    }, {
      where: {
        id,
      },
    })
}

// DELETE
export const environmentDeleting = async (id) => {
  const doesEnvExist = await getEnvironmentById(id)
  if (!doesEnvExist) throw new Error('L\'environnement demandé n\'existe pas en base pour ce projet')
  return await getEnvironmentModel().update({
    status: 'deleting',
  }, {
    where: {
      id,
    },
  })
}

export const deleteEnvironment = async (id) => {
  await sequelize.destroy({
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
