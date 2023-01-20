import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getUserModel } from './models.js'
import { getUniq } from '../utils/queries-tools.js'

// SELECT
export const getUsers = async () => {
  return await getUserModel().findAll()
}

export const getUserById = async (id) => {
  return await getUserModel().findByPk(id)
}

export const getUserByEmail = async (email) => {
  const res = await getUserModel().findAll({
    where: {
      email: { [Op.eq]: email },
    },
  })
  return getUniq(res)
}

// CREATE
export const createUser = async ({ id, email, firstName, lastName }) => {
  const user = await getUserByEmail(email)
  if (user) throw Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return await getUserModel().create({ id, email, firstName, lastName })
}

// UPDATE
export const updateUserById = async ({ id, name, email, firstName, lastName }) => {
  const user = await getUserById(id)
  const isEmailAlreadyTaken = await getUserByEmail(email)
  if (!user) throw Error('L\'utilisateur demandé n\'existe pas')
  if (isEmailAlreadyTaken) throw Error('Un utilisateur avec cette adresse e-mail existe déjà')
  if (user && !isEmailAlreadyTaken) {
    const res = await getUserModel().update({
      name,
      email,
      firstName,
      lastName,
    }, {
      where: id,
    })
    return res
  }
}

// DROP
export const dropUsersTable = async () => {
  await sequelize.drop({
    tableName: getUserModel().tableName,
    force: true,
    cascade: true,
  })
}
