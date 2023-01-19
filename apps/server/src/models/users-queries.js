import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getUserModel } from './models.js'
import { getUniq } from '../utils/queries-tools.js'

// SELECT
export const getUsers = async () => {
  const res = await getUserModel().findAll()
  return res
}

export const getUserById = async (id) => {
  const res = await getUserModel().findByPk(id)
  return res
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
  if (!user) {
    const res = await getUserModel().create({ id, email, firstName, lastName })
    return res
  }
  return user
}

// UPDATE
export const updateUserById = async ({ id, name, email, firstName, lastName }) => {
  const user = await getUserById(id)
  const isEmailAlreadyTaken = await getUserByEmail(email)
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
  if (!user) throw Error('Cet utilisateur n\'existe pas')
  if (isEmailAlreadyTaken) throw Error('Email déjà utilisé pour un autre user')
}

// DROP
export const dropUsersTable = async () => {
  await sequelize.drop({
    tableName: getUserModel().tableName,
    force: true,
    cascade: true,
  })
}
