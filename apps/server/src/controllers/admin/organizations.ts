import {
  getOrganizations,
  createOrganization,
  updateActiveOrganization,
  updateLabelOrganization,
  getOrganizationByName,
} from '../../models/queries/organization-queries.js'
import { addLogs } from '../../models/queries/log-queries.js'
import { organizationSchema, getUniqueListBy } from 'shared'
import { addReqLogs } from '../../utils/logger.js'
import { sendOk, sendCreated, sendNotFound, sendBadRequest } from '../../utils/response.js'
import { hooks } from '../../plugins/index.js'
import { HookPayload, PluginResult } from '@/plugins/hooks/hook.js'
import { objectValues } from '@/utils/type.js'
import { OrganizationModel } from 'shared/types/index.js'

// GET
export const getAllOrganizationsController = async (req, res) => {
  try {
    const organizations = await getOrganizations()
    addReqLogs({
      req,
      description: 'Organisations récupérées avec succès',
    })
    sendOk(res, organizations)
  } catch (error) {
    const description = 'Echec de la récupération des organisations'
    addReqLogs({
      req,
      description,
      error,
    })
    sendNotFound(res, description)
  }
}

// POST
export const createOrganizationController = async (req, res) => {
  const data = req.body

  try {
    await organizationSchema.validateAsync(data)

    const isNameTaken = await getOrganizationByName(data.name)
    if (isNameTaken) throw new Error('Cette organisation existe déjà')

    const organization = await createOrganization(data)

    addReqLogs({
      req,
      description: 'Organisation créée avec succès',
      extras: {
        organizationId: organization.id,
      },
    })
    sendCreated(res, organization)
  } catch (error) {
    const description = 'Echec de la création de l\'organisation'
    addReqLogs({
      req,
      description,
      error,
    })
    sendBadRequest(res, description)
  }
}

// PUT
export const updateOrganizationController = async (req, res) => {
  const name = req.params.orgName
  const { active, label, source } = req.body

  try {
    if (active !== undefined) {
      await updateActiveOrganization({ name, active })
    }
    if (label) {
      await updateLabelOrganization({ name, label, source })
    }
    const organization = await getOrganizationByName(name)

    addReqLogs({
      req,
      description: 'Organisation mise à jour avec succès',
      extras: {
        organizationId: organization.id,
      },
    })
    sendCreated(res, organization)
  } catch (error) {
    const description = 'Echec de la mise à jour de l\'organisation'
    addReqLogs({
      req,
      description,
      extras: {
        organizationName: name,
      },
      error,
    })
    sendBadRequest(res, description)
  }
}

export const fetchOrganizationsController = async (req, res) => {
  const user = req.session.user

  try {
    let consoleOrganizations = await getOrganizations() as OrganizationModel[]

    // TODO: Fix define return in plugins dir
    // @ts-ignore See TODO
    type PluginOrganization = { name: string, label: string, source: string }
    type FetchOrganizationsResult = PluginResult & { result: {organizations: PluginOrganization[]}}
    const results = await hooks.fetchOrganizations.execute() as HookPayload<void> & Record<string, FetchOrganizationsResult>

    await addLogs('Fetch organizations', results, user.id)

    // TODO: Fix type
    // @ts-ignore See TODO
    if (results.failed) throw new Error('Echec des services à la synchronisation des organisations')

    /**
    * Filter plugin results to get a single array of organizations with unique name
    */
    const externalOrganizations = getUniqueListBy(objectValues(results)
      ?.reduce((acc: Record<string, any>[], value) => {
        if (typeof value !== 'object' || !value.result.organizations?.length) return acc
        return [...acc, ...value.result.organizations]
      }, [])
      ?.filter(externalOrg => externalOrg.name), 'name') as PluginOrganization[]

    if (!externalOrganizations.length) throw new Error('Aucune organisation à synchroniser')

    for (const externalOrg of externalOrganizations) {
      await organizationSchema.validateAsync(externalOrg)
      if (consoleOrganizations.find(consoleOrg => consoleOrg.name === externalOrg.name)) {
        await updateLabelOrganization(externalOrg)
      } else {
        await createOrganization(externalOrg)
      }
    }

    consoleOrganizations = await getOrganizations()
    addReqLogs({
      req,
      description: 'Organisations synchronisées avec succès',
    })
    sendCreated(res, consoleOrganizations)
  } catch (error) {
    const description = error.message
    addReqLogs({
      req,
      description,
      error,
    })
    sendBadRequest(res, description)
  }
}
