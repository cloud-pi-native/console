import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './project.js'
import { projectSchema } from 'shared/src/schemas/project.js'

export const createProject = async (project) => {
  await projectSchema.validateAsync(project)
  const alreadyExist = await checkUniqueProject(project.orgName, project.projectName)
  if (alreadyExist) {
    throw new Error(`Project '${project.orgName}/${project.projectName}' already exists in database`)
  }

  const res = await getProjectModel().create({ data: project })
  return res?.data
}

export const addRepo = async (project, repo) => {
  if (project.repos.find(existingRepo => existingRepo.internalRepoName === repo.internalRepoName)) {
    // TODO : gérer - renvoi d'une erreur ?
    return
  }

  project.repos = project.repos?.length ? [...project.repos, repo] : [repo]
  await projectSchema.validateAsync(project)

  const res = await getProjectModel().update({
    data: project,
  }, {
    where: {
      data: {
        id: {
          [Op.eq]: project.id,
        },
      },
    },
  })
  return res
}

export const addUser = async (project, user) => {
  if (project.users.find(existingUser => existingUser.email === user.email) ||
    project.owner.email === user.email) {
    // TODO : gérer - renvoi d'une erreur ?
    return
  }

  project.users = project.users?.length ? [...project.users, user] : [user]
  await projectSchema.validateAsync(project)

  const res = await getProjectModel().update({
    data: project,
  }, {
    where: {
      data: {
        id: {
          [Op.eq]: project.id,
        },
      },
    },
  })
  return res
}

export const removeUser = async (project, userEmail) => {
  project.users = project.users.filter(user => user.email !== userEmail)
  await projectSchema.validateAsync(project)

  const res = await getProjectModel().update({
    data: project,
  }, {
    where: {
      data: {
        id: {
          [Op.eq]: project.id,
        },
      },
    },
  })
  return res
}

export const getProjectById = async (projectId) => {
  const res = await getProjectModel().findOne({
    where: {
      id: {
        [Op.eq]: projectId,
      },
    },
  })
  return res?.data
}

export const getUserProjectById = async (projectId, userId) => {
  const res = await sequelize.query(`SELECT data FROM "Projects" WHERE (("data"#>>'{owner,id}') = '${userId}' OR data->'users' @> '[{"id": "${userId}"}]') AND ("data"#>>'{id}') = '${projectId}' LIMIT 1;`, { type: sequelize.QueryTypes?.SELECT, model: getProjectModel(), plain: true })
  return res?.data
}

export const getUserProjects = async (userId) => {
  const res = await sequelize.query(`SELECT data FROM "Projects" WHERE (("data"#>>'{owner,id}') = '${userId}' OR data->'users' @> '[{"id": "${userId}"}]');`, { type: sequelize.QueryTypes?.SELECT, model: getProjectModel() })
  return res.map(project => project.data)
}

export const checkUniqueProject = async (orgName, projectName) => {
  const res = await getProjectModel().findOne({
    where: {
      [Op.and]: [
        {
          data: {
            projectName: {
              [Op.iLike]: projectName,
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
