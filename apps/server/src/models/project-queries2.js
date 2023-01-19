import { Sequelize } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './project.js'
import { getReposByProjectId } from './repository-queries.js'
import { getEnvironmentsByProjectId } from './environment-queries.js'

// SELECT
export const getUserProjects = async (userId) => {
  const res = await getProjectModel().findAll({
    where: {
      [Sequelize.Op.or]: [
        { ownerId: userId },
        { usersId: { [Sequelize.Op.contains]: [userId] } },
      ],
    },
  })
  return res
}

export const getProject = async (name, organization) => {
  const res = await getProjectModel().findAll({
    where: {
      name,
      organization,
    },
  })
  return res[0]
}

// CREATE
export const projectInitialize = async ({ name, organization, ownerId }) => {
  const res = await getProjectModel().create({ name, organization, usersId: [ownerId], status: 'initializing', locked: true, ownerId })
  return res
}

// UPDATE
export const projectCreated = async ({ name, organization }) => {
  const res = await getProjectModel().update({ locked: false, status: 'created' }, { where: { name, organization } })
  return res
}

export const projectFailed = async ({ name, organization }) => {
  const res = await getProjectModel().update({ locked: false, status: 'failed' }, { where: { name, organization } })
  return res
}

export const projectAddUser = async ({ name, organization, userId }) => {
  // TODO s'assurer que le user exist dans le model User
  const project = await getProject(name, organization)
  console.log(project.dataValues.usersId)
  const users = project.dataValues.usersId ?? [project.dataValues.ownerId]
  if (users.indexOf(userId) === -1) {
    console.log('no')
    await getProjectModel().update({
      usersId: sequelize.fn('array_append', sequelize.col('usersId'), userId),
    }, {
      where: { name, organization },
    })
  }
  return project
}

export const projectDeleting = async ({ name, organization }) => {
  const project = await getProject(name, organization)
  console.log(project.dataValues)
  const projectId = project.dataValues.id
  // Ensure Projects has zero ressources
  await getProjectModel().
  if (project.dataValues.id) {
    
  }
  return project
}

// DROP
export const dropProjectsTable = async () => {
  await sequelize.drop({
    tableName: getProjectModel().tableName,
    force: true,
    cascade: true,
  })
}

// DELETE / TRUNCATE
// export const getProjectModel = () => Project ?? (Project = sequelize.define('Project', {
//   id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     autoIncrement: true,
//     unique: true,
//     primaryKey: true,
//   },
//   name: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//   },
//   owner_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//   },
//   organization: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//   },
//   users: {
//     type: DataTypes.ARRAY(DataTypes.INTEGER),
//     allowNull: true,
//   },
//   status: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//   },
//   locked: {
//     type: DataTypes.BOOLEAN,
//     allowNull: false,
//     defaultValue: false,
//   },
// }, {
//   tableName: 'Projects',
// }))
