import type { AddMemberInput, PatchMemberInput } from './project-members-queries.utils'
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { KeycloakClientService } from '../keycloak/keycloak-client.service'
import { deleteProjectMember, getHumanUser, getProjectOwnerId, listProjectMembersWithUser, upsertProjectMember, upsertProjectMemberIfMissing } from './project-members-queries.utils'

@Injectable()
export class ProjectMembersService {
  private readonly logger = new Logger(ProjectMembersService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(KeycloakClientService) private readonly keycloak: KeycloakClientService,
  ) {}

  @StartActiveSpan()
  async list(projectId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.debug(`projectMembers.listMembers started (projectId=${projectId})`)
    const members = await listProjectMembersWithUser(this.prisma, projectId)
    span?.setAttribute('project.members.count', members.length)
    this.logger.debug(`projectMembers.listMembers completed (projectId=${projectId}, count=${members.length})`)
    return members
  }

  @StartActiveSpan()
  async add(
    projectId: string,
    body: AddMemberInput,
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
        if (!project) throw new NotFoundException('Projet introuvable')

        const userId = 'userId' in body ? body.userId : undefined
        const email = 'email' in body ? body.email : undefined

        const userDb = await this.resolveHumanUser(tx, { userId, email })
        if (!userDb) throw new NotFoundException('Utilisateur introuvable')

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

  private async resolveHumanUser(
    tx: Parameters<typeof getHumanUser>[0],
    opts: { userId?: string, email?: string },
  ) {
    const userDb = await getHumanUser(tx, opts)
    if (userDb || !opts.email) {
      return userDb
    }

    const keycloakUser = await this.keycloak.getUserByEmail(opts.email)
    if (!keycloakUser) {
      return null
    }

    const keycloakUserId = keycloakUser.id ?? opts.email
    return tx.user.upsert({
      where: { id: keycloakUserId },
      create: {
        id: keycloakUserId,
        email: keycloakUser.email ?? opts.email,
        firstName: keycloakUser.firstName ?? keycloakUser.email ?? opts.email,
        lastName: keycloakUser.lastName ?? '',
        adminRoleIds: [],
        type: 'human',
      },
      update: {
        email: keycloakUser.email ?? opts.email,
        firstName: keycloakUser.firstName ?? keycloakUser.email ?? opts.email,
        lastName: keycloakUser.lastName ?? '',
        type: 'human',
      },
    })
  }

  @StartActiveSpan()
  async patch(
    projectId: string,
    body: PatchMemberInput[],
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
  async remove(projectId: string, userId: string) {
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
