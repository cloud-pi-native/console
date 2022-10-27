import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './project.js'
import { projectSchema } from 'shared/src/projects/schema.js'

export const createProject = async (data) => {
  await projectSchema.validateAsync(data)
  const alreadyExist = await getProjectByName(data.projectName)
  if (alreadyExist) {
    throw new Error(`Project '${data.projectName}' already exists in database`)
  }

  const res = await getProjectModel().create({ data }, { attributes: ['data'] })
  return res
}

export const getProjectByName = async (name) => {
  const res = await getProjectModel().findOne({
    where: {
      data: {
        projectName: {
          [Op.iLike]: name,
        },
      },
    },
    attributes: ['data'],
  })
  return res
}

export const getUserProjectById = async (id, userId) => {
  const res = await sequelize.query(`SELECT data FROM "Projects" WHERE (("data"#>>'{owner,id}') = '${userId}' OR data->'users' @> '[{"id": "${userId}"}]') AND ("data"#>>'{id}') = '${id}' LIMIT 1;`, { type: sequelize.QueryTypes.SELECT, model: getProjectModel(), plain: true })
  return res
}

export const getUserProjects = async (userId) => {
  const res = await sequelize.query(`SELECT data FROM "Projects" WHERE (("data"#>>'{owner,id}') = '${userId}' OR data->'users' @> '[{"id": "${userId}"}]');`, { type: sequelize.QueryTypes.SELECT, model: getProjectModel() })
  return res
}
