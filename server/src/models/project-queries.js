import { query } from '../connect.js'
import { nanoid } from 'nanoid'

export const createProject = async (data) => {
  data.id = nanoid()
  data = JSON.stringify(data)
  const res = query(`INSERT INTO public.projects(project) VALUES ('${data}');`)
  return res
}

export const getProjectById = async (id) => {
  const res = query(`SELECT * FROM projects WHERE project ->> 'id' = '${id}' LIMIT 1;`)
  return res
}

export const getProjects = () => {
  const res = query('SELECT * FROM projects')
  return res
}