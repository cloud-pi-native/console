import {
  getOrganizationsController,
  createOrganizationController,
} from '../controllers/organization.js'

const router = async (app, _opt) => {
  await app.get('/', getOrganizationsController)

  await app.post('/', createOrganizationController)
}

export default router
