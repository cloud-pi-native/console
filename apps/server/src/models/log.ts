import { DataTypes } from 'sequelize'

export const getLogModel = {
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
    defaultValue: '',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}
