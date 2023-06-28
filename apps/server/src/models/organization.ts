import { DataTypes } from 'sequelize'

export const getOrganizationModel = {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    unique: true,
    defaultValue: DataTypes.UUIDV4,
  },
  source: {
    type: DataTypes.STRING(50),
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  label: {
    type: DataTypes.STRING(90),
    allowNull: false,
    unique: false,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}
