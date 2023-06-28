import { DataTypes } from 'sequelize'

export const getPermissionModel = {
  id: {
    type: DataTypes.UUID,
    unique: true,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
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
}
