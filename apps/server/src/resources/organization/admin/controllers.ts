import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { createOrganization, fetchOrganizations, getAllOrganization, updateOrganization } from './business.js'
import { type FastifyRequestWithSession } from '@/types/index.js'
import { type CreateOrganizationDto, type UpdateOrganizationDto, type OrganizationParams } from '@dso-console/shared'
import { type RouteHandler } from 'fastify'

// GET
export const getAllOrganizationsController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const organizations = await getAllOrganization()
  addReqLogs({
    req,
    description: 'Organisations récupérées avec succès',
  })
  sendOk(res, organizations)
}

// POST
export const createOrganizationController: RouteHandler = async (req: FastifyRequestWithSession<{
  Body: CreateOrganizationDto
}>, res) => {
  const data = req.body
  const organization = await createOrganization(data)

  addReqLogs({
    req,
    description: 'Organisation créée avec succès',
    extras: {
      organizationId: organization.id,
    },
  })
  sendCreated(res, organization)
}

// PUT
export const updateOrganizationController: RouteHandler = async (req: FastifyRequestWithSession<{
  Body: UpdateOrganizationDto
  Params: OrganizationParams
}>, res) => {
  const name = req.params?.orgName
  const { active, label, source } = req.body

  const organization = await updateOrganization(name, active, label, source)

  addReqLogs({
    req,
    description: 'Organisation mise à jour avec succès',
    extras: {
      organizationId: organization.id,
    },
  })
  sendCreated(res, organization)
}

export const fetchOrganizationsController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const userId = req.session.user.id

  const consoleOrganizations = await fetchOrganizations(userId)

  addReqLogs({
    req,
    description: 'Organisations synchronisées avec succès',
  })
  sendCreated(res, consoleOrganizations)
}
