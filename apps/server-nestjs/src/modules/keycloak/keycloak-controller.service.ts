import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ProjectAuthorized, getPermsByUserRoles, resourceListToDict } from '@cpn-console/shared'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { KeycloakService } from './keycloak.service'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js'
import { KeycloakDatastoreService, type ProjectWithDetails } from './keycloak-datastore.service'
import { CONSOLE_GROUP_NAME } from './keycloak.constant'
import { isMember } from './keycloack.utils'
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('keycloak-controller')

@Injectable()
export class KeycloakControllerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KeycloakControllerService.name)

  constructor(
    @Inject(KeycloakService) private readonly keycloak: KeycloakService,
    @Inject(KeycloakDatastoreService) private readonly keycloakDatastore: KeycloakDatastoreService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    this.logger.log('KeycloakControllerService initialized')
  }

  onApplicationBootstrap() {
    this.handleCron()
  }

  @OnEvent('project.upsert')
  async handleUpsert(project: ProjectWithDetails) {
    return tracer.startActiveSpan('handleUpsert', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        this.logger.log(`Handling project upsert for ${project.slug}`)
        await this.ensureProjectGroups([project])
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails) {
    return tracer.startActiveSpan('handleDelete', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        this.logger.log(`Handling project delete for ${project.slug}`)
        await this.purgeOrphanGroups([project])
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    return tracer.startActiveSpan('handleCron', async (span) => {
      try {
        this.logger.log('Starting periodic Keycloak reconciliation')
        const projects = await this.keycloakDatastore.getAllProjects()
        span.setAttribute('projects.count', projects.length)
        this.logger.debug(`Reconciling ${projects.length} projects`)
        await this.ensureProjectGroups(projects)
        await this.purgeOrphanGroups(projects)
        span.end()
        this.logger.log('Periodic Keycloak reconciliation completed')
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private ensureProjectGroups(projects: ProjectWithDetails[]) {
    return tracer.startActiveSpan('ensureProjectGroups', async (span) => {
      try {
        await Promise.all(projects.map(async (project) => {
          const projectGroup = await this.keycloak.getOrCreateGroupByPath(`/${project.slug}`)
          await this.ensureProjectGroup(project, projectGroup)
          await Promise.all([
            this.ensureProjectRoleGroups(project, projectGroup),
            this.ensureEnvironmentGroups(project, projectGroup),
          ])
        }))
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async purgeOrphanGroups(projects: ProjectWithDetails[]) {
    return tracer.startActiveSpan('purgeOrphanGroups', async (span) => {
      try {
        const groups = this.keycloak.getAllGroups()
        const projectSlugs = new Set(projects.map(p => p.slug))
        const promises: Promise<void>[] = []
        let purgedCount = 0

        for await (const group of groups) {
          if (group.name && !projectSlugs.has(group.name)) {
            if (this.isOwnedProjectGroup(group)) {
              if (group.id) {
                this.logger.log(`Deleting orphan Keycloak group: ${group.name}`)
                purgedCount++
                promises.push(
                  this.keycloak.deleteGroup(group.id)
                    .catch((error) => {
                      this.logger.error(`Failed to delete orphan group ${group.name}`, error)
                      if (error instanceof Error) span.recordException(error)
                    }),
                )
              } else {
                this.logger.warn(`Orphan Keycloak group detected but ID is missing: ${group.name}`)
              }
            }
          }
        }
        span.setAttribute('purged.count', purgedCount)
        await Promise.all(promises)
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private isOwnedProjectGroup(group: GroupRepresentation) {
    // Safety check: Only delete if it looks like a project group (has 'console' subgroup)
    // or if we can be sure it's not a system group.
    // For now, we rely on the 'console' subgroup heuristic as it's created by us.
    return !!group.subGroups?.some(sg => sg.name === CONSOLE_GROUP_NAME)
  }

  private async maybeAddUserToGroup(userId: string, groupId: string, groupName: string) {
    try {
      await this.keycloak.addUserToGroup(userId, groupId)
      this.logger.log(`Added ${userId} to keycloak group ${groupName}`)
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn(`User ${userId} not found in Keycloak, skipping addition to group ${groupName}`)
      } else if (error.response?.status === 409) {
        this.logger.debug(`User ${userId} is already a member of keycloak group ${groupName}`)
      } else {
        throw error
      }
    }
  }

  private async maybeRemoveUserFromGroup(userId: string, groupId: string, groupName: string) {
    try {
      await this.keycloak.removeUserFromGroup(userId, groupId)
      this.logger.log(`Removed ${userId} from keycloak group ${groupName}`)
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn(`User ${userId} not found in Keycloak, skipping removal from group ${groupName}`)
      } else {
        throw error
      }
    }
  }

  private async ensureProjectGroup(project: ProjectWithDetails, projectGroup: GroupRepresentation) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    const groupMembers = await this.keycloak.getGroupMembers(projectGroup.id)
    await Promise.all([
      this.addMissingProjectMembers(project, projectGroup, groupMembers),
      this.deleteExtraProjectMembers(project, projectGroup, groupMembers),
    ])
  }

  private async addMissingProjectMembers(
    project: ProjectWithDetails,
    projectGroup: GroupRepresentation,
    members: UserRepresentation[],
  ) {
    const promises = project.members.map(async (member) => {
      if (!members.some(m => m.id === member.user.id)) {
        if (member.user.id && projectGroup.id) {
          await this.maybeAddUserToGroup(member.user.id, projectGroup.id, projectGroup.name!)
        }
      }
    })
    await Promise.all([
      ...promises,
      this.addMissingOwner(project, projectGroup, members),
    ])
  }

  private async addMissingOwner(
    project: ProjectWithDetails,
    projectGroup: GroupRepresentation,
    members: UserRepresentation[],
  ) {
    if (!projectGroup.id || !projectGroup.name) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    if (!members.some(m => m.id === project.ownerId)) {
      await this.maybeAddUserToGroup(project.ownerId, projectGroup.id, projectGroup.name)
    }
  }

  private async deleteExtraProjectMembers(
    project: ProjectWithDetails,
    projectGroup: GroupRepresentation,
    members: UserRepresentation[],
  ) {
    await Promise.all(members.map(async (member) => {
      if (!member.id || !projectGroup.id || !projectGroup.name) {
        throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
      }
      if (!isMember(project, member)) {
        await this.maybeRemoveUserFromGroup(member.id, projectGroup.id, projectGroup.name)
      }
    }))
  }

  private async ensureProjectRoleGroups(project: ProjectWithDetails, projectGroup: GroupRepresentation) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    await Promise.all(project.roles.map(async (role) => {
      if (role.oidcGroup) {
        const roleGroup = await this.keycloak.getOrCreateGroupByPath(role.oidcGroup)
        if (!roleGroup.id) {
          throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
        }
        const groupMembers = await this.keycloak.getGroupMembers(roleGroup.id)
        await Promise.all([
          this.addMissingRoleMembers(roleGroup, project, role, groupMembers),
          this.deleteExtraRoleMembers(roleGroup, project, role, groupMembers),
        ])
      }
    }))
  }

  private async addMissingRoleMembers(
    roleGroup: GroupRepresentation,
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    members: UserRepresentation[],
  ) {
    await Promise.all(project.members.map(async (member) => {
      if (!members.some(m => m.id === member.user.id) && member.roleIds.includes(role.id)) {
        if (!roleGroup.id || !roleGroup.name) {
          throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
        }
        await this.maybeAddUserToGroup(member.user.id, roleGroup.id, roleGroup.name)
      }
    }))
  }

  private async deleteExtraRoleMembers(
    roleGroup: GroupRepresentation,
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    members: UserRepresentation[],
  ) {
    await Promise.all(members.map(async (member) => {
      if (!isMember(project, member) && member.groups?.some(g => g === roleGroup.path)) {
        if (!member.id || !roleGroup.id || !roleGroup.name) {
          throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
        }
        await this.maybeRemoveUserFromGroup(member.id, roleGroup.id, roleGroup.name)
      }
    }))
  }

  private async ensureEnvironmentGroups(project: ProjectWithDetails, projectGroup: GroupRepresentation) {
    const consoleGroup = await this.keycloak.getOrCreateConsoleGroup(projectGroup)
    await Promise.all([
      ...project.environments.map(environment =>
        this.ensureEnvironmentGroup(consoleGroup, environment, project)),
      this.purgeOrphanEnvironmentGroups(consoleGroup, project),
    ])
  }

  private async purgeOrphanEnvironmentGroups(consoleGroup: GroupRepresentation, project: ProjectWithDetails) {
    if (!consoleGroup.id) {
      throw new Error(`Failed to create or retrieve console group for ${project.slug}`)
    }

    const promises: Promise<void>[] = []

    for await (const envGroup of this.keycloak.getSubGroups(consoleGroup.id)) {
      if (!this.isOwnedEnvironmentGroup(envGroup, project) && envGroup.id) {
        this.logger.log(`Deleting orphan environment group ${envGroup.name} for project ${project.slug}`)
        promises.push(
          this.keycloak.deleteGroup(envGroup.id)
            .catch(e => this.logger.warn(`Failed to delete environment group ${envGroup.name} for project ${project.slug}`, e)),
        )
      }
    }
    await Promise.all(promises)
  }

  private isOwnedEnvironmentGroup(
    envGroup: GroupRepresentation,
    project: ProjectWithDetails,
  ) {
    return project.environments.some(e => e.name === envGroup.name)
  }

  private async ensureEnvironmentGroup(
    consoleGroup: GroupRepresentation,
    environment: ProjectWithDetails['environments'][number],
    project: ProjectWithDetails,
  ) {
    const { roGroup, rwGroup } = await this.keycloak.getOrCreateEnvironmentGroups(consoleGroup, environment)
    if (!roGroup.id || !rwGroup.id) {
      throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
    }

    const rolesById = resourceListToDict(project.roles)

    // Get current members of RO and RW groups to ensure we clean up removed users
    const [roMembers, rwMembers] = await Promise.all([
      this.keycloak.getGroupMembers(roGroup.id),
      this.keycloak.getGroupMembers(rwGroup.id),
    ])

    await Promise.all([
      this.ensureEnvironmentMemberPermissions(
        environment,
        project,
        rolesById,
        roGroup,
        rwGroup,
        roMembers,
        rwMembers,
      ),
      this.purgeOrphanMembersFromEnvironment(
        environment,
        project,
        roGroup,
        rwGroup,
        roMembers,
        rwMembers,
      ),
    ])
  }

  private async ensureEnvironmentMemberPermissions(
    environment: ProjectWithDetails['environments'][number],
    project: ProjectWithDetails,
    rolesById: Record<string, any>,
    roGroup: GroupRepresentation,
    rwGroup: GroupRepresentation,
    roMembers: UserRepresentation[],
    rwMembers: UserRepresentation[],
  ) {
    if (!roGroup.id || !rwGroup.id) {
      throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
    }

    const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])

    await Promise.all(Array.from(projectUserIds).map(async (userId) => {
      const perms = this.getUserPermissions(userId, project, rolesById)

      // Sync RO
      const isInRo = roMembers.some(m => m.id === userId)
      if (perms.ro && !isInRo) {
        await this.maybeAddUserToGroup(userId, roGroup.id!, `RO group for ${environment.name}`)
      } else if (!perms.ro && isInRo) {
        await this.maybeRemoveUserFromGroup(userId, roGroup.id!, `RO group for ${environment.name}`)
      }

      // Sync RW
      const isInRw = rwMembers.some(m => m.id === userId)
      if (perms.rw && !isInRw) {
        await this.maybeAddUserToGroup(userId, rwGroup.id!, `RW group for ${environment.name}`)
      } else if (!perms.rw && isInRw) {
        await this.maybeRemoveUserFromGroup(userId, rwGroup.id!, `RW group for ${environment.name}`)
      }
    }))
  }

  private async purgeOrphanMembersFromEnvironment(
    environment: ProjectWithDetails['environments'][number],
    project: ProjectWithDetails,
    roGroup: GroupRepresentation,
    rwGroup: GroupRepresentation,
    roMembers: UserRepresentation[],
    rwMembers: UserRepresentation[],
  ) {
    const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])

    await Promise.all([
      ...roMembers.map(async (member) => {
        if (!member.id) {
          throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
        }
        if (!projectUserIds.has(member.id)) {
          if (!roGroup.id) {
            throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
          }
          await this.maybeRemoveUserFromGroup(member.id, roGroup.id, `RO group for ${environment.name}`)
        }
      }),
      ...rwMembers.map(async (member) => {
        if (!member.id) {
          throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
        }
        if (!projectUserIds.has(member.id)) {
          if (!rwGroup.id) {
            throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
          }
          await this.maybeRemoveUserFromGroup(member.id, rwGroup.id, `RW group for ${environment.name}`)
        }
      }),
    ])
  }

  private getUserPermissions(userId: string, project: ProjectWithDetails, rolesById: Record<string, any>) {
    if (userId === project.ownerId) return { ro: true, rw: true }
    const member = project.members.find(m => m.user.id === userId)
    if (!member) return { ro: false, rw: false }

    const projectPermissions = getPermsByUserRoles(member.roleIds, rolesById, project.everyonePerms)

    return {
      ro: ProjectAuthorized.ListEnvironments({ adminPermissions: 0n, projectPermissions }),
      rw: ProjectAuthorized.ManageEnvironments({ adminPermissions: 0n, projectPermissions }),
    }
  }
}
