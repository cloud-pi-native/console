import { Op, QueryTypes } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './project.js'
import { projectSchema } from 'shared/src/schemas/project.js'
import { achievedStatus } from 'shared/src/utils/iterables.js'

export const createProject = async (project) => {
  await projectSchema.validateAsync(project)
  const alreadyExist = await checkUniqueProject(project.orgName, project.projectName)
  if (alreadyExist) {
    throw new Error(`Project '${project.orgName}/${project.projectName}' already exists in database`)
  }

  const res = await getProjectModel().create({ data: project })
  return res?.data
}

export const updateProjectStatus = async (project, status) => {
  project.status = status
  project.locked = !achievedStatus.includes(status)
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

export const addRepo = async (project, repo) => {
  if (project.repos?.find(existingRepo => existingRepo.internalRepoName === repo.internalRepoName)) {
    throw new Error(`Git repo '${repo.internalRepoName}' already exists in project`)
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
  if (project.users?.find(existingUser => existingUser.email === user.email) ||
  project.owner.email === user.email) {
    throw new Error(`User with email '${user.email}' already member of project`)
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
  const res = await sequelize.query(
    'SELECT data FROM "Projects" WHERE (("data"#>>\'{owner,id}\') = $userId OR data->\'users\' @> \'[{"id": "$userId"}]\') AND ("data"#>>\'{id}\') = $projectId LIMIT 1;',
    {
      type: sequelize.QueryTypes?.SELECT,
      bind: { projectId, userId },
      model: getProjectModel(),
      plain: true,
    }).catch(e => { throw e })
  return res?.data
}

export const getAllProject = async () => {
  const res = await sequelize.query(
    'SELECT * FROM "Projects";', { type: QueryTypes.SELECT }).catch(e => { throw e })
  return res
}

export const getUserProjects = async (userId) => {
  const res = await sequelize.query(
    'SELECT data FROM "Projects" WHERE (("data"#>>\'{owner,id}\') = $userId OR data->\'users\' @> \'[{"id": "$userId"}]\');',
    {
      type: sequelize.QueryTypes?.SELECT,
      bind: { userId },
      model: getProjectModel(),
    }).catch(e => { throw e })
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

export const _deleteAllProjects = () => getProjectModel().destroy({ truncate: true })
