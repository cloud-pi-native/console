import Pool from 'pg-pool'

export const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: 'dso-console-db',
    user: 'admin',
    password: 'admin',
  })

export const getConnection = async () => {
  await pool.connect()
}

export const query = (text, params, callback) => {
  const res = pool.query(text, params, callback)
  return res
}

export const closeConnections = async () => {
  await pool.end()
}