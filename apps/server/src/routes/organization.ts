import {
  getActiveOrganizationsController,
} from '@/resources/organization/controllers.js'

const router = async (app, _opt) => {
  await app.get('/', getActiveOrganizationsController)
}

export default router
