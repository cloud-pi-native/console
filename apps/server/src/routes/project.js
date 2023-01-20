import {
  getUserProjectsController,
  getProjectByIdController,
  createProjectController,
  projectAddUserController,
  projectRemoveUserController,
  projectArchivingController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  // GET
  await app.get('/', getUserProjectsController)
  await app.get('/:id', getProjectByIdController)
  // POST
  await app.post('/', createProjectController)
  // PUT
  await app.put('/:id/users', projectAddUserController)
  // DELETE
  await app.delete('/:id/users', projectRemoveUserController)
  await app.delete('/:id', projectArchivingController)
}

export default router
