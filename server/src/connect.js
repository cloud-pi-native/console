// TODO : open et close connexion to db

import Pool from 'pg'

let pool

export const getConnection = async () => {
  pool = new Pool()
}

export const query = async (text, params, callback) => {
  console.log('start query')
  const res = await pool.query(text, params, callback)
  console.log('end query, res: ', res)
  return res
}

export const closeConnections = async () => {
  console.log('closing')
  await pool.end()
  console.log('closed')
}