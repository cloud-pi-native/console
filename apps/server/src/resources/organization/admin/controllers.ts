import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { createOrganization, fetchOrganizations, getAllOrganization, updateOrganization } from './business.js'
import type { CreateOrganizationDto, UpdateOrganizationDto, OrganizationParams } from '@dso-console/shared'
import type { FastifyRequest, FastifyInstance } from 'fastify'

import { getAllOrganizationsSchema, createOrganizationSchema, fetchOrganizationsSchema, updateOrganizationSchema } from '@dso-console/shared'
import { BadRequestError } from '@/utils/errors.js'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer toutes les organisations
  app.get('/',
    {
      schema: getAllOrganizationsSchema,
    },
    async (req: FastifyRequest, res) => {
      const organizations = await getAllOrganization()
      addReqLogs({
        req,
        description: 'Organisations récupérées avec succès',
      })
      sendOk(res, organizations)
    })

  // Créer une organisation
  app.post('/',
    {
      schema: createOrganizationSchema,
    },
    async (req: FastifyRequest<{
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
    })

  // Synchroniser les organisations via les plugins externes
  app.put('/sync',
    {
      schema: fetchOrganizationsSchema,
    },
    async (req: FastifyRequest, res) => {
      const userId = req.session.user.id

      const consoleOrganizations = await fetchOrganizations(userId, req.id)

      addReqLogs({
        req,
        description: 'Organisations synchronisées avec succès',
      })
      sendCreated(res, consoleOrganizations)
    })

  // Mettre à jour une organisation
  app.put('/:orgName',
    {
      schema: updateOrganizationSchema,
    },

    async (req: FastifyRequest<{
  Body: UpdateOrganizationDto
  Params: OrganizationParams
}>, res) => {
      const name = req.params.orgName
      const { active, label, source } = req.body

      const organization = await updateOrganization(name, active, label, source)
      if (!organization) throw new BadRequestError('L\'organisation n\'existe pas')

      addReqLogs({
        req,
        description: 'Organisation mise à jour avec succès',
        extras: {
          organizationId: organization.id,
        },
      })
      sendCreated(res, organization)
    })
}

export default router
