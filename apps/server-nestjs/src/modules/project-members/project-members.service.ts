import type { projectMemberContract } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { getHumanUser, getProjectOwnerId } from '../project/project-queries.utils.js'
import {
  deleteProjectMember,
  listProjectMembersWithUser,
  upsertProjectMember,
  upsertProjectMemberIfMissing,
} from './project-members-queries.utils.js'

@Injectable()
export class ProjectMembersService {
  private readonly logger = new Logger(ProjectMembersService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  @StartActiveSpan()
  async listMembers(projectId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.debug(`projectMembers.listMembers started (projectId=${projectId})`)
    const members = await listProjectMembersWithUser(this.prisma, projectId)
    span?.setAttribute('project.members.count', members.length)
    this.logger.debug(`projectMembers.listMembers completed (projectId=${projectId}, count=${members.length})`)
    return members
  }

  @StartActiveSpan()
  async addMember(
    projectId: string,
    body: typeof projectMemberContract.addMember.body._type,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    const lookupBy = 'userId' in body ? 'userId' : 'email'
    span?.setAttribute('project.member.lookupBy', lookupBy)
    const userIdCandidate = 'userId' in body ? body.userId : undefined
    this.logger.log(`projectMembers.addMember started (projectId=${projectId}, lookupBy=${lookupBy}, userId=${userIdCandidate})`)
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const project = await getProjectOwnerId(tx, projectId)
        if (!project) throw new NotFoundException()

        const userId = 'userId' in body ? body.userId : undefined
        const email = 'email' in body ? body.email : undefined

        const userDb = await getHumanUser(tx, { userId, email })
        if (!userDb) {
          if (email) {
            throw new BadRequestException('Utilisateur introuvable (la recherche par email nécessite le hook Keycloak, non disponible dans cette version)')
          }
          throw new NotFoundException('Utilisateur introuvable')
        }

        if (userDb.id === project.ownerId) {
          throw new BadRequestException('Le owner ne peut pas être ajouté à cette liste')
        }

        await upsertProjectMemberIfMissing(tx, projectId, userDb.id)

        const members = await listProjectMembersWithUser(tx, projectId)
        return { userId: userDb.id, members }
      })
      await this.eventEmitter.emitAsync('projectMember.upsert', { projectId, userId: result.userId })
      span?.setAttribute('project.member.userId', result.userId)
      span?.setAttribute('project.members.count', result.members.length)
      this.logger.log(`projectMembers.addMember completed (projectId=${projectId}, userId=${result.userId}, memberCount=${result.members.length})`)
      return result.members
    } catch (error) {
      this.logger.error(
        `projectMembers.addMember failed (projectId=${projectId}, lookupBy=${lookupBy}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  @StartActiveSpan()
  async patchMembers(
    projectId: string,
    body: typeof projectMemberContract.patchMembers.body._type,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    span?.setAttribute('project.members.patch.count', body.length)
    this.logger.log(`projectMembers.patchMembers started (projectId=${projectId}, patchCount=${body.length})`)
    try {
      const members = await this.prisma.$transaction(async (tx) => {
        for (const member of body) {
          await upsertProjectMember(tx, projectId, member)
        }
        return listProjectMembersWithUser(tx, projectId)
      })
      await Promise.all(
        body.map(member => this.eventEmitter.emitAsync('projectMember.upsert', { projectId, userId: member.userId })),
      )
      span?.setAttribute('project.members.count', members.length)
      this.logger.log(`projectMembers.patchMembers completed (projectId=${projectId}, memberCount=${members.length})`)
      return members
    } catch (error) {
      this.logger.error(
        `projectMembers.patchMembers failed (projectId=${projectId}, patchCount=${body.length}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  @StartActiveSpan()
  async removeMember(projectId: string, userId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    span?.setAttribute('project.member.userId', userId)
    this.logger.log(`projectMembers.removeMember started (projectId=${projectId}, userId=${userId})`)
    try {
      const members = await this.prisma.$transaction(async (tx) => {
        await deleteProjectMember(tx, projectId, userId)
        return listProjectMembersWithUser(tx, projectId)
      })
      await this.eventEmitter.emitAsync('projectMember.delete', { projectId, userId })
      span?.setAttribute('project.members.count', members.length)
      this.logger.log(`projectMembers.removeMember completed (projectId=${projectId}, userId=${userId}, memberCount=${members.length})`)
      return members
    } catch (error) {
      this.logger.error(
        `projectMembers.removeMember failed (projectId=${projectId}, userId=${userId}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }
}
