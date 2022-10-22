import { Op } from 'sequelize'
import { getProject } from './project.js'
import { projectSchema } from 'shared/src/projects/schema.js'

export const createProject = async (data) => {
  await projectSchema.validateAsync(data)
  const alreadyExist = await getProjectByName(data.projectName)
  if (alreadyExist) {
    throw new Error(`Project '${data.projectName}' already exists in database`)
  }

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

export const getProjectByName = async (name) => {
  const res = await getProject().findOne({
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

export const getProjects = async () => {
  const res = await getProject().findAll({ attributes: ['data'] })
  return res
}
