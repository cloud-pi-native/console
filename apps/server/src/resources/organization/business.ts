import { getUniqueListBy, objectValues, organizationContract, OrganizationSchema } from '@cpn-console/shared'
import { User } from '@prisma/client'
import prisma from '@/prisma.js'
import {
  getOrganizationByName,
  createOrganization as createOrganizationQuery,
  getOrganizations,
  addLogs,
  updateOrganization as updateOrganizationQuery,
} from '@/resources/queries-index.js'
import { validateSchema } from '@/utils/business.js'
import { BadRequest400, ErrorResType, NotFound404, Unprocessable422 } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

export const listOrganizations = (query?: typeof organizationContract.listOrganizations.query._type) =>
  getOrganizations(query)

export const createOrganization = async (data: typeof organizationContract.createOrganization.body._type) => {
  const isNameTaken = await getOrganizationByName(data.name)
  if (isNameTaken) return new BadRequest400('Cette organisation existe déjà')

  return createOrganizationQuery(data)
}

export const updateOrganization = async (
  name: typeof organizationContract.updateOrganization.pathParams._type.organizationName,
  org: typeof organizationContract.updateOrganization.body._type,
) => {
  const organization = await getOrganizationByName(name)
  if (!organization) return new NotFound404()

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
    return new Unprocessable422('Echec des services à la synchronisation des organisations')
  }

  /**
  * Filter plugin results to get a single array of organizations with unique name
  */
  const externalOrganizations = getUniqueListBy(objectValues(hookReply.results)
    .reduce((acc, value) => {
      if (typeof value !== 'object' || !value.result.organizations?.length) return acc
      return [...acc, ...value.result.organizations]
    }, [] as Record<string, { name: string }>[])
    // @ts-ignore cast le typage
    .filter(externalOrg => externalOrg.name), 'name') as PluginOrganization[]

  if (!externalOrganizations.length) return new NotFound404()

  for (const externalOrg of externalOrganizations) {
    const schemaValidation = OrganizationSchema.pick({ name: true, label: true }).safeParse(externalOrg)
    const validateResult = validateSchema(schemaValidation)
    if (validateResult instanceof ErrorResType) continue

    if (consoleOrganizations.find(consoleOrg => consoleOrg.name === externalOrg.name)) {
      await updateOrganizationQuery(externalOrg)
    } else {
      await createOrganization(externalOrg)
    }
  }

  return getOrganizations()
}
