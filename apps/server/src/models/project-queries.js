import { Op } from 'sequelize'
import { getProject } from './project.js'

export const createProject = async (data) => {
  const res = await getProject().create({ data }, { attributes: ['data'] })
  return res
}

export const getProjectById = async (id) => {
  const res = await getProject().findOne({
    where: {
      data: {
        id: {
          [Op.eq]: id,
        },
      },
    },
    attributes: ['data'],
  })
  return res
}

export const getProjects = async () => {
  const res = await getProject().findAll({ attributes: ['data'] })
  return res
}
