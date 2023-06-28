import { DataTypes } from 'sequelize'
import { descriptionMaxLength } from 'shared'

export const getProjectModel = {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  organization: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(descriptionMaxLength),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  locked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  services: {
    type: DataTypes.JSONB,
  },
}
