import { sequelize } from '../connect.js'
import { getEnvironmentModel, getProjectModel } from './models.js'
import { getUniq } from '../utils/queries-tools.js'
import { getProjectById } from './project-queries.js'

// SELECT
export const getEnvironmentById = async (id) => {
  const res = await getEnvironmentModel().findByPk(id)
  return res
}

export const getEnvironment = async ({ projectId, name }) => {
  const res = await getEnvironmentModel().findAll({
    where: { name, projectId },
    include: { model: getProjectModel() },
  })
  return getUniq(res)
}

export const getEnvironmentsByProjectId = async (projectId) => {
  const res = await getEnvironmentModel().findAll({
    where: { projectId },
    include: { model: getProjectModel() },
  })
  return res
}

export const getProjectByEnvironmentId = async (envId) => {
  const env = await getEnvironmentById(envId)
  const project = await getProjectById(env.projectId)
  return project
}

// INSERT
export const environmentInitializing = async ({ name, projectId }) => {
  const res = await getEnvironmentModel().create(
    { name, projectId, status: 'initializing' }, {
      where: {
        name,
        projectId,
      },
      include: {
        model: getProjectModel(),
      },
    })
  return getUniq(res)
}

// UPDATE
export const environmentCreated = async (id) => {
  const res = await getEnvironmentModel().update(
    {
      status: 'created',
    }, {
      where: {
        id,
      },
    })
  return getUniq(res)
}

export const environmentFailed = async (id) => {
  const res = await getEnvironmentModel().update(
    {
      status: 'failed',
    }, {
      where: {
        id,
      },
    })
  return getUniq(res)
}

// DELETE

// TODO : requête delete

// DROP
export const dropEnvironmentsTable = async () => {
  await sequelize.drop({
    tableName: getEnvironmentModel().tableName,
    force: true,
    cascade: true,
  })
}
