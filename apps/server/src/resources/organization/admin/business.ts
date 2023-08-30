import { hooks } from '@/plugins/index.js'
import { HookPayload, PluginResult } from '@/plugins/hooks/hook.js'
import { addLogs, createOrganization, getOrganizationByName, getOrganizations, getProjectByOrganizationId, lockProject, updateActiveOrganization, updateLabelOrganization } from '@/resources/queries-index.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { BadRequestError, NotFoundError } from '@/utils/errors.js'
import { objectValues } from '@/utils/type.js'
import { Organization, User } from '@prisma/client'
import { getUniqueListBy, organizationSchema } from 'shared'

export const getAllOrganizationBusiness = async () => {
  const allOrganizations = await getOrganizations()
  if (!allOrganizations?.length) throw new NotFoundError('Aucune organisation trouvée', undefined)
  return allOrganizations
}

export const createOrganizationBusiness = async (data: Organization) => {
  try {
    await organizationSchema.validateAsync(data)
  } catch (error) {
    throw new BadRequestError(error.message, undefined)
  }

  const isNameTaken = await getOrganizationByName(data.name)
  if (isNameTaken) throw new BadRequestError('Cette organisation existe déjà', undefined)

  return createOrganization(data)
}

export const updateOrganizationBusiness = async (name: Organization['name'], active: Organization['active'], label: Organization['label'], source: Organization['source']) => {
  const organization = await getOrganizationByName(name)

  if (active !== undefined) {
    await updateActiveOrganization({ name, active })
    /** lock project if organization becomes inactive */
    if (active === false) {
      const projects = await getProjectByOrganizationId(organization.id)
      for (const project of projects) {
        await lockProject(project.id)
      }
    }
    /** unlock project if organization becomes active and no resource is failed */
    if (active === true) {
      const projects = await getProjectByOrganizationId(organization.id)
      for (const project of projects) {
        await unlockProjectIfNotFailed(project.id)
      }
    }
  }
  if (label) {
    await updateLabelOrganization({ name, label, source })
  }
  return getOrganizationByName(name)
}

export const fetchOrganizationsBusiness = async (userId: User['id']) => {
  const consoleOrganizations = await getOrganizations()

    // TODO: Fix define return in plugins dir
    // @ts-ignore See TODO
    type PluginOrganization = { name: string, label: string, source: string }
    type FetchOrganizationsResult = PluginResult & { result: { organizations: PluginOrganization[] } }
    const results = await hooks.fetchOrganizations.execute() as HookPayload<void> & Record<string, FetchOrganizationsResult>

    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Fetch organizations', results, userId)

    // TODO: Fix type
    // @ts-ignore See TODO
    if (results.failed) throw new BadRequestError('Echec des services à la synchronisation des organisations', undefined)

    /**
    * Filter plugin results to get a single array of organizations with unique name
    */
    const externalOrganizations = getUniqueListBy(objectValues(results)
      ?.reduce((acc: Record<string, any>[], value) => {
        if (typeof value !== 'object' || !value.result.organizations?.length) return acc
        return [...acc, ...value.result.organizations]
      }, [])
      ?.filter(externalOrg => externalOrg.name), 'name') as PluginOrganization[]

    if (!externalOrganizations.length) throw new NotFoundError('Aucune organisation à synchroniser', undefined)

    for (const externalOrg of externalOrganizations) {
      await organizationSchema.validateAsync(externalOrg)
      if (consoleOrganizations.find(consoleOrg => consoleOrg.name === externalOrg.name)) {
        await updateLabelOrganization(externalOrg)
      } else {
        await createOrganization(externalOrg)
      }
    }

    return getOrganizations()
}
