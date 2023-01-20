import {
  getOrganizationsController,
  createOrganizationController,
} from '../controllers/organization.js'

const router = async (app, _opt) => {
  // GET
  await app.get('/', getOrganizationsController)
  // POST
  await app.post('/', createOrganizationController)
}

export default router
