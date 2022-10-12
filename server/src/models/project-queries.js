import { query } from '../connect.js'

export const createProject = async (data) => {
  const res = query(`INSERT INTO projects VALUES (${data})`)
  return res
}

export const getProjectById = async (id) => {
  db.query(`SELECT * FROM projects WHERE project ->> 'id' = ${id} LIMIT 1;`)
  return res
}

export const getProjects = () => {
  const res = query('SELECT * FROM projects')
  return res
}