import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

let Permission
export const getPermissionModel = () => Permission ?? (Permission = sequelize.define('Permission', {
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  environmentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'Permissions',
  primaryKey: ['userId', 'environmentId'],
}))
