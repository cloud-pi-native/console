import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './project.js'
import { getUserModel } from './user.js'

let UsersProjects
export const getUsersProjectsModel = () => UsersProjects ?? (UsersProjects = sequelize.define('UsersProjects', {
  UserId: {
    type: DataTypes.UUID,
    references: {
      model: getUserModel(),
      key: 'id',
    },
  },
  ProjectId: {
    type: DataTypes.UUID,
    references: {
      model: getProjectModel(),
      key: 'id',
    },
  },
  role: {
    type: DataTypes.STRING,
  },
}))
