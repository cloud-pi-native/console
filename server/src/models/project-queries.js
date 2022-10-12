import { db } from '../connect.js'

// TODO : utiliser JSONB
export const createProject = async (data) => {
  return db.query(`INSERT INTO projects VALUES (${data})`)
}

export const getProjectById = async (id) => {
  db.query(`select * from projects where project ->> 'id' = ${id} limit 1;`)
  return db.query(`SELECT * FROM projects WHERE id = ${id}`)
}

export const getProjects = async () => {
  return db.query('SELECT * FROM projects')
}