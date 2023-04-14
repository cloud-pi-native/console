import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

let Log
export const getLogModel = () => Log ?? (Log = sequelize.define('Log', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'Logs',
}))
