import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

let Environment
export const getEnvironmentModel = () => Environment ?? (Environment = sequelize.define('Environment', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'initializing',
  },
}, {
  tableName: 'Environments',
}))
