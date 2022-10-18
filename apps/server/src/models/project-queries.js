import { query } from '../connect.js'
import { nanoid } from 'nanoid'
import { allServices } from '../utils/project.js'

export const createProject = async (data) => {
  data.id = nanoid()
  data.services = allServices
  data = JSON.stringify(data)
  const res = await query(`INSERT INTO public.projects(data) VALUES ('${data}');`)
  return res.rows[0]
}

export const getProjectById = async (id) => {
  const res = await query(`SELECT data FROM projects WHERE (data ->> 'id') = '${id}' LIMIT 1;`)
  return res.rows[0]
}

export const getProjects = async () => {
  const res = await query('SELECT data FROM projects')
  return res.rows
}
