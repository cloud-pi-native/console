import { Op } from 'sequelize'
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

// TODO : ajouter itération dans users[].id (cf test en dessous)
export const getUserProjectById = async (id, userId) => {
  const res = await getProjectModel().findOne({
    where: {
      data: {
        [Op.and]: [{
          id: {
            [Op.eq]: id,
          },
        }, {
          owner: {
            id: {
              [Op.eq]: userId,
            },
          },
        },
        ],
      },
    },
    attributes: ['data'],
  })
  return res
}

// TODO : ajouter itération dans users[].id (test en dessous)
export const getUserProjects = async (userId) => {
  const res = await getProjectModel().findAll({
    where: {
      data: {
        owner: {
          id: {
            [Op.eq]: userId,
          },
        },
      },
    },
    attributes: ['data'],
  })
  return res
}

// export const getUserProjects = async (userId) => {
//   console.log({ userId })
//   const res = await getProjectModel().findAll({
//     where: {
//       data: {
//         [Op.or]: [
//           {
//             owner: {
//               id: {
//                 [Op.eq]: userId,
//               },
//             },
//           }, {
//             users: {
//               [Op.contains]: {
//                 id: {
//                   [Op.eq]: userId,
//                 },
//               },
//             },
//           },
//         ],
//       },
//     },
//     attributes: ['data'],
//   })
//   console.log({ res })
//   return res
// }
