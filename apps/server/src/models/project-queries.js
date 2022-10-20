import { Op } from 'sequelize'
import Project from './project.js'

export const createProject = async (data) => {
  const res = await Project().create({ data })
  return res
}

export const getProjectById = async (id) => {
  const res = await Project().findOne({
    where: {
      'data.id': {
        [Op.eq]: id,
      },
    },
    attributes: ['data'],
  })
  return res
}

export const getProjects = async () => {
  const res = await Project().findAll({ attributes: ['data'] })
  return res
}
