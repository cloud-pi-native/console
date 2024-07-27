import prisma from '@/prisma.js'
import {
  getOrganizationByName,
  createOrganization as createOrganizationQuery,
  getOrganizations,
  addLogs,
  updateOrganization as updateOrganizationQuery,
} from '@/resources/queries-index.js'
import { validateSchema } from '@/utils/business.js'
import { BadRequestError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'
import { getUniqueListBy, objectValues, organizationContract, OrganizationSchema } from '@cpn-console/shared'
import { User } from '@prisma/client'

export const listOrganizations = (query?: typeof organizationContract.listOrganizations.query._type) =>
  getOrganizations(query)

export const createOrganization = async (data: typeof organizationContract.createOrganization.body._type) => {
  const isNameTaken = await getOrganizationByName(data.name)
  if (isNameTaken) throw new BadRequestError('Cette organisation existe déjà', undefined)

  return createOrganizationQuery(data)
}

export const updateOrganization = async (
  name: typeof organizationContract.updateOrganization.pathParams._type.organizationName,
  org: typeof organizationContract.updateOrganization.body._type,
) => {
  const organization = await getOrganizationByName(name)
  if (!organization) throw new NotFoundError(`Organisation ${name} introuvable`)

  /** lock project if organization becomes inactive */
  if (organization.active === true && org.active === false) {
    await prisma.project.updateMany({
      data: { locked: true },
      where: { organizationId: organization.id },
    })
  }
  if (organization.active === false && org.active === true) {
    await prisma.project.updateMany({
      data: { locked: false },
      where: { organizationId: organization.id },
    })
  }
  return updateOrganizationQuery({ name, ...org })
}

export const fetchOrganizations = async (userId: User['id'], requestId: string) => {
  const consoleOrganizations = await getOrganizations()

  type PluginOrganization = { name: string, label: string, source: string }

  const hookReply = await hook.misc.fetchOrganizations()
  await addLogs('Fetch organizations', hookReply, userId, requestId)
  if (hookReply.failed) {
    throw new UnprocessableContentError('Echec des services à la synchronisation des organisations')
  }

  /**
  * Filter plugin results to get a single array of organizations with unique name
  */
  const externalOrganizations = getUniqueListBy(objectValues(hookReply.results)
    ?.reduce((acc: Record<string, any>[], value) => {
      if (typeof value !== 'object' || !value.result.organizations?.length) return acc
      return [...acc, ...value.result.organizations]
    }, [])
    ?.filter(externalOrg => externalOrg.name), 'name') as PluginOrganization[]

  if (!externalOrganizations.length) throw new NotFoundError('Aucune organisation à synchroniser', undefined)

  for (const externalOrg of externalOrganizations) {
    const schemaValidation = OrganizationSchema.pick({ name: true, label: true }).safeParse(externalOrg)
    validateSchema(schemaValidation)
    if (consoleOrganizations.find(consoleOrg => consoleOrg.name === externalOrg.name)) {
      await updateOrganizationQuery(externalOrg)
    } else {
      await createOrganization(externalOrg)
    }
  }

  return getOrganizations()
}
