import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './project.js'
import { projectSchema } from 'shared/src/schemas/project.js'

export const createProject = async (data) => {
  await projectSchema.validateAsync(data)
  const alreadyExist = await checkUniqueProject(data.orgName, data.projectName)
  if (alreadyExist) {
    throw new Error(`Project '${data.orgName}/${data.projectName}' already exists in database`)
  }

  const res = await getProjectModel().create({ data })
  return res.data
}

export const updateProject = async (data) => {
  await projectSchema.validateAsync(data)

  const res = await getProjectModel().update({
    data,
  }, {
    where: {
      data: {
        id: data.id,
      },
    },
  })
  return res
}

export const getUserProjectById = async (id, userId) => {
  const res = await sequelize.query(`SELECT data FROM "Projects" WHERE (("data"#>>'{owner,id}') = '${userId}' OR data->'users' @> '[{"id": "${userId}"}]') AND ("data"#>>'{id}') = '${id}' LIMIT 1;`, { type: sequelize.QueryTypes?.SELECT, model: getProjectModel(), plain: true })
  return res.data
}

export const getUserProjects = async (userId) => {
  const res = await sequelize.query(`SELECT data FROM "Projects" WHERE (("data"#>>'{owner,id}') = '${userId}' OR data->'users' @> '[{"id": "${userId}"}]');`, { type: sequelize.QueryTypes?.SELECT, model: getProjectModel() })
  return res.map(project => project.data)
}

export const checkUniqueProject = async (orgName, name) => {
  const res = await getProjectModel().findOne({
    where: {
      [Op.and]: [
        {
          data: {
            projectName: {
              [Op.iLike]: name,
            },
          },
        },
        {
          data: {
            orgName: {
              [Op.eq]: orgName,
            },
          },
        },
      ],
    },
  })
  return res
}

export const _deleteAllProjects = async () => await getProjectModel().destroy({ truncate: true })
