import { DataTypes } from 'sequelize'
import { getProjectModel } from './project.js'
import { getUserModel } from './user.js'

export const getUsersProjectsModel = {
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
}
