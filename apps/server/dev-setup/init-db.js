import createProject from './create-project.js'

export const initDb = async () => {
  return Promise.all([
    createProject(),
  ])
}
