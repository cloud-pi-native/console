import { query } from '../connect.js'

// TODO : insert id: generatedId in data
// TODO : si repo, créer repo dans la table repos puis project.repo.push(repo.id) ?
export const createProject = async (data) => {
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