import { projects } from 'shared/dev-setup/projects.js'
import { users } from 'shared/dev-setup/users.js'

export const getProjectbyId = (id) => projects.find(project => project.id === id)
export const getUserById = (id) => users.find(user => user.id === id)
