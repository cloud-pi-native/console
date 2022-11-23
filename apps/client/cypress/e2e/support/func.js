import { projects } from 'shared/dev-setup/projects.js'

export const getProjectbyId = (id) => projects.find(project => project.id === id)
