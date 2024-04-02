import type { Organization, User } from '@prisma/client'
import { type CreateOrganizationDto, getUniqueListBy, OrganizationSchema, objectValues } from '@cpn-console/shared'
import { addLogs, createOrganization as createOrganizationQuery, getOrganizationByName, getOrganizations, getProjectByOrganizationId, lockProject, unlockProject, updateActiveOrganization, updateLabelOrganization } from '@/resources/queries-index.js'
import { hook } from '@/utils/hook-wrapper.js'
import { validateSchema } from '@/utils/business.js'
import { BadRequestError, NotFoundError } from '@/utils/errors.js'

export const getAllOrganization = async () => {
  const allOrganizations = await getOrganizations()
  if (!allOrganizations?.length) throw new NotFoundError('Aucune organisation trouvée', undefined)
  return allOrganizations
}

export const createOrganization = async (data: CreateOrganizationDto) => {
  const schemaValidation = OrganizationSchema.omit({ id: true, active: true }).safeParse(data)
  validateSchema(schemaValidation)

  const isNameTaken = await getOrganizationByName(data.name)
  if (isNameTaken) throw new BadRequestError('Cette organisation existe déjà', undefined)

  return createOrganizationQuery(data)
}

export const updateOrganization = async (name: Organization['name'], active?: Organization['active'], label?: Organization['label'], source?: Organization['source']) => {
  const organization = await getOrganizationByName(name)
  if (!organization) throw new NotFoundError(`Organisation ${name} introuvable`)

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
        await unlockProject(project.id)
      }
    }
  }
  if (label && source) {
    await updateLabelOrganization({ name, label, source })
  }
  return getOrganizationByName(name)
}

export const fetchOrganizations = async (userId: User['id'], requestId: string) => {
  const consoleOrganizations = await getOrganizations()

  type PluginOrganization = { name: string, label: string, source: string }
  const results = await hook.misc.fetchOrganizations()

  await addLogs('Fetch organizations', results, userId, requestId)

  if (results.failed) {
    throw new BadRequestError('Echec des services à la synchronisation des organisations', undefined)
  }

  /**
  * Filter plugin results to get a single array of organizations with unique name
  */
  const externalOrganizations = getUniqueListBy(objectValues(results.results)
    ?.reduce((acc: Record<string, any>[], value) => {
      if (typeof value !== 'object' || !value.result.organizations?.length) return acc
      return [...acc, ...value.result.organizations]
    }, [])
    ?.filter(externalOrg => externalOrg.name), 'name') as PluginOrganization[]

  if (!externalOrganizations.length) throw new NotFoundError('Aucune organisation à synchroniser', undefined)

  for (const externalOrg of externalOrganizations) {
    const schemaValidation = OrganizationSchema.omit({ id: true, active: true }).safeParse(externalOrg)
    validateSchema(schemaValidation)
    if (consoleOrganizations.find(consoleOrg => consoleOrg.name === externalOrg.name)) {
      await updateLabelOrganization(externalOrg)
    } else {
      await createOrganization(externalOrg)
    }
  }

  return getOrganizations()
}
