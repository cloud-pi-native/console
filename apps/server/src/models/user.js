import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

let User
export const getUserModel = () => User ?? (User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'Users',
}))
