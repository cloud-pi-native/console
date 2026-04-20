import type { Project, User } from '@cpn-console/database'
import type { projectMemberContract, XOR } from '@cpn-console/shared'
import { logger as baseLogger } from '@cpn-console/logger'
import { UserSchema } from '@cpn-console/shared'
import prisma from '@/prisma.js'
import {
  addLogs,
  deleteMember,
  listMembers as listMembersQuery,
  upsertMember,
} from '@/resources/queries-index.js'
import { BadRequest400, NotFound404 } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'
import { logViaSession } from '../user/business.js'

const logger = baseLogger.child({ scope: 'resource:project-member' })

export const listMembers = async (projectId: Project['id']) => listMembersQuery(projectId)

export async function addMember(projectId: Project['id'], user: XOR<{ userId: string }, { email: string }>, requestorId: User['id'], requestId: string, projectOwnerId: Project['ownerId']) {
  let userInDb: User | undefined | null

  logger.info({ requestId, requestorId, projectId, identifierType: user.userId ? 'userId' : 'email' }, 'Add project member started')
  if (user.userId) {
    userInDb = await prisma.user.findUnique({ where: { id: user.userId, type: 'human' } })
  } else if (user.email) {
    userInDb = await prisma.user.findUnique({ where: { email: user.email, type: 'human' } })
  } else {
    return new BadRequest400('Veuillez spécifiez au moins un userId ou un email')
  }
  if (userInDb) {
    if (userInDb.id === projectOwnerId) return new BadRequest400('Le owner ne peut pas être ajouté à cette liste')
  } else if (user.email) {
    const hookReply = await hook.user.retrieveUserByEmail(user.email)
    await addLogs({ action: 'Retrieve User By Email', data: hookReply, userId: requestorId, requestId })
    if (hookReply.failed) {
      logger.error({ requestId, requestorId, projectId }, 'Add project member failed during user lookup hooks')
      throw new BadRequest400('Echec de la recherche auprès des services externes')
    }

    const retrievedUser = hookReply.results.keycloak?.user
    if (!retrievedUser) return new BadRequest400('Utilisateur introuvable')
    const userValidated = UserSchema.pick({ email: true, firstName: true, lastName: true, id: true }).safeParse(retrievedUser)
    if (!userValidated.success) return new BadRequest400('L\'utilisateur trouvé ne remplit pas les conditions de vérification')
    const logResults = await logViaSession({ ...userValidated.data, groups: [] })
    userInDb = logResults.user
  } else {
    return new NotFound404()
  }

  await upsertMember({ projectId, userId: userInDb.id, roleIds: [] })
  await hook.projectMember.upsert(projectId, userInDb.id)
  logger.info({ requestId, requestorId, projectId, userId: userInDb.id }, 'Add project member completed')
  return listMembers(projectId)
}

export async function patchMembers(projectId: Project['id'], members: typeof projectMemberContract.patchMembers.body._type) {
  logger.info({ projectId, membersCount: members.length }, 'Patch project members started')
  for (const member of members) {
    await upsertMember({ projectId, userId: member.userId, roleIds: member.roles })
    await hook.projectMember.upsert(projectId, member.userId)
  }
  logger.info({ projectId, membersCount: members.length }, 'Patch project members completed')
  return listMembers(projectId)
}

export async function removeMember(projectId: Project['id'], userId: User['id']) {
  logger.info({ projectId, userId }, 'Remove project member started')
  await hook.projectMember.delete(projectId, userId)
  await deleteMember({ projectId, userId })
  logger.info({ projectId, userId }, 'Remove project member completed')
  return listMembers(projectId)
}
