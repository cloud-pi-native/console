import { Sequelize } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './project.js'

// SELECT
export const getUserProjects = async (userUuid) => {
  const res = await getProjectModel().findAll({
    where: {
      [Sequelize.Op.or]: [
        { ownerUuid: userUuid },
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
export const projectInitialize = async ({ name, organization, ownerUuid }) => {
  const res = await getProjectModel().create({ name, organization, users: [], status: 'initializing', locked: true, ownerUuid })
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

export const projectAddUser = async ({ name, organization, userUuid }) => {
  const project = await getProject(name, organization)
  const users = Array.from(project.dataValues.users)
  if (users.indexOf(userUuid) === -1) {
    console.log('no')
    await getProjectModel().update({
      users: sequelize.fn('array_append', sequelize.col('users'), userUuid),
    }, {
      where: { name, organization },
    })
  }
  return project
}
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
