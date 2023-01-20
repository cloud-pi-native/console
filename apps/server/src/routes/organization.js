import {
  getOrganizationsController,
} from '../controllers/organization.js'

const router = async (app, _opt) => {
  await app.get('/', getOrganizationsController)
}

export default router
