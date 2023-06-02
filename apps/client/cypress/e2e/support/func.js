import { data } from 'test-utils'

const { projects, users, organizations } = data

export const getProjectbyId = (id) => projects.find(project => project.id === id)
export const getUserById = (id) => users.find(user => user.id === id)

export const getUserProjects = (userId) => {
  const userProjects = []
  projects.forEach(project => {
    if (project.users.find(user => user.id === userId) && project.status !== 'archived') {
      userProjects.push(project)
    }
  })
  return userProjects
}

export const getUsers = () => {
  return users
}

export const getOrganizations = () => {
  return organizations
}

export const getProjects = () => {
  return projects
}
