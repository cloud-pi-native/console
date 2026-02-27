import type { OnModuleInit } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ProjectAuthorized, getPermsByUserRoles, resourceListToDict } from '@cpn-console/shared'
import type { Prisma, User } from '@prisma/client'
import type { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'
import type { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import type { KeycloakService } from './keycloak.service'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js'

const projectSelect = {
  id: true,
  slug: true,
  ownerId: true,
  everyonePerms: true,
  members: {
    select: {
      roleIds: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
  roles: {
    select: {
      id: true,
      permissions: true,
      oidcGroup: true,
    },
  },
  environments: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

@Injectable()
export class KeycloakReconcilerService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakReconcilerService.name)
  private readonly consoleGroupName = 'console'

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigurationService,
  ) {}

  onModuleInit() {
    this.logger.log('KeycloakReconcilerService initialized')
  }

  @OnEvent('project.upsert')
  async handleUpsert(project: ProjectWithDetails) {
    this.logger.log(`Handling project upsert for ${project.slug}`)
    return this.reconcile()
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails) {
    this.logger.log(`Handling project delete for ${project.slug}`)
    return this.reconcile()
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting periodic Keycloak reconciliation')
    await this.reconcile()
    this.logger.log('Periodic Keycloak reconciliation completed')
  }

  private async reconcile() {
    try {
      const projects = await this.prisma.project.findMany({
        select: projectSelect,
      })

      const projectGroupResults = await this.ensureProjectGroups(projects)
      projectGroupResults.forEach((result) => {
        if (result.status === 'rejected') {
          this.logger.error(`Failed to ensure project group ${result.reason}`)
        }
      })

      await this.purgeOrphanGroups(projects)
    } catch (error) {
      this.logger.error('Failed to reconcile Keycloak state', error)
    }
  }

  private ensureProjectGroups(projects: ProjectWithDetails[]) {
    return Promise.allSettled(projects.map(async (project) => {
      const projectGroup = await this.keycloakService.getOrCreateGroupByPath(`/${project.slug}`)
      await this.ensureProjectGroup(projectGroup, project)
      await this.ensureProjectRoleGroups(projectGroup, project)
      await this.ensureEnvironmentGroups(projectGroup, project)
    }))
  }

  private async purgeOrphanGroups(projects: ProjectWithDetails[]) {
    const groups = await this.keycloakService.getGroups()
    const projectSlugs = new Set(projects.map(p => p.slug))

    for await (const group of groups) {
      if (group.name && projectSlugs.has(group.name)) {
        if (this.isOwnedConsoleGroup(group)) {
          if (this.configService.keycloakReconcilerPurgeOrphans) {
            if (group.id) {
              this.logger.log(`Deleting orphan Keycloak group: ${group.name}`)
              await this.keycloakService.deleteGroup(group.id)
            } else {
              this.logger.warn(`Orphan Keycloak group detected but ID is missing: ${group.name}`)
            }
          } else {
            this.logger.warn(`Orphan Keycloak group detected but purge is disabled: ${group.name}`)
          }
        }
      }
    }
  }

  private isOwnedConsoleGroup(group: GroupRepresentation) {
    // Safety check: Only delete if it looks like a project group (has 'console' subgroup)
    // or if we can be sure it's not a system group.
    // For now, we rely on the 'console' subgroup heuristic as it's created by us.
    return !!group.subGroups?.some(sg => sg.name === this.consoleGroupName)
  }

  private async ensureProjectGroup(projectGroup: GroupRepresentation, project: ProjectWithDetails) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    const groupMembers = await this.keycloakService.listGroupMembers(projectGroup.id)

    return Promise.all([
      this.addMissingProjectMembers(projectGroup, project, groupMembers),
      this.deleteExtraProjectMembers(projectGroup, project, groupMembers),
    ])
  }

  private async addMissingProjectMembers(
    projectGroup: GroupRepresentation,
    project: ProjectWithDetails,
    members: UserRepresentation[],
  ) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }

    const promises: Promise<void>[] = []

    // Add missing members
    for (const member of project.members) {
      if (!members.some(m => m.id === member.user.id)) {
        promises.push(
          this.keycloakService.addUserToGroup(member.user.id, projectGroup.id)
            .then(() => this.logger.log(`Added ${member.user.email} to keycloak project group ${projectGroup.name}`))
            .catch(err => this.logger.warn(`Can't add ${member.user.email} to keycloak project group`, err)),
        )
      }
    }

    // Add owner if missing
    if (!members.some(m => m.id === project.ownerId)) {
      promises.push(
        this.keycloakService.addUserToGroup(project.ownerId, projectGroup.id)
          .then(() => this.logger.log(`Added owner ${project.ownerId} to keycloak project group ${projectGroup.name}`))
          .catch(err => this.logger.warn(`Can't add owner ${project.ownerId} to keycloak project group`, err)),
      )
    }
  }

  private async deleteExtraProjectMembers(
    projectGroup: GroupRepresentation,
    project: ProjectWithDetails,
    members: UserRepresentation[],
  ) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }

    const promises: Promise<void>[] = []

    // Remove extra members
    for (const member of members) {
      const isMember = project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
      if (!isMember) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          promises.push(
            this.keycloakService.removeUserFromGroup(member.id!, projectGroup.id)
              .then(() => this.logger.log(`Removed ${member.email} from keycloak project group ${projectGroup.name}`))
              .catch(err => this.logger.warn(`Can't remove ${member.email} from keycloak project group`, err)),
          )
        } else {
          this.logger.warn(`User ${member.email} is in Keycloak group but not in project ${project.slug} (purge disabled)`)
        }
      }
    }
  }

  private async ensureProjectRoleGroups(projectGroup: GroupRepresentation, project: ProjectWithDetails) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }

    const promises: Promise<void>[] = []

    for (const role of project.roles) {
      if (role.oidcGroup) {
        const roleGroup = await this.keycloakService.getOrCreateGroupByPath(role.oidcGroup)
        if (!roleGroup.id) {
          throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
        }
        const groupMembers = await this.keycloakService.listGroupMembers(roleGroup.id)
        if (roleGroup.id) {
          promises.push(
            this.addMissingRoleMembers(roleGroup, project, role, groupMembers),
          )
          promises.push(
            this.deleteExtraRoleMembers(roleGroup, project, role, groupMembers),
          )
        }
      }
    }
  }

  private async addMissingRoleMembers(
    roleGroup: GroupRepresentation,
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    members: UserRepresentation[],
  ) {
    if (!roleGroup.id) {
      throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
    }

    const promises: Promise<void>[] = []

    // Add missing members
    for (const member of project.members) {
      if (!members.some(m => m.id === member.user.id) && member.roleIds.includes(role.id)) {
        promises.push(
          this.keycloakService.addUserToGroup(member.user.id, roleGroup.id)
            .then(() => this.logger.log(`Added ${member.user.email} to keycloak role group ${roleGroup.name}`))
            .catch(err => this.logger.warn(`Can't add ${member.user.email} to keycloak role group`, err)),
        )
      }
    }
  }

  private async deleteExtraRoleMembers(
    roleGroup: GroupRepresentation,
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    members: UserRepresentation[],
  ) {
    if (!roleGroup.id) {
      throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
    }

    const promises: Promise<void>[] = []

    // Remove extra members
    for (const member of members) {
      const isMember = project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
      if (!isMember && member.groups?.some(g => g === roleGroup.path)) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          promises.push(
            this.keycloakService.removeUserFromGroup(member.id!, roleGroup.id)
              .then(() => this.logger.log(`Removed ${member.email} from keycloak role group ${roleGroup.name}`))
              .catch(err => this.logger.warn(`Can't remove ${member.email} from keycloak role group`, err)),
          )
        } else {
          this.logger.warn(`User ${member.email} is in Keycloak group but not in project ${project.slug} (purge disabled)`)
        }
      }
    }
  }

  private async ensureEnvironmentGroups(projectGroup: GroupRepresentation, project: ProjectWithDetails) {
    const consoleGroup = await this.getOrCreateConsoleGroup(projectGroup)
    for (const environment of project.environments) {
      await this.ensureEnvironmentGroup(consoleGroup, environment, project)
    }
    await this.purgeOrphanEnvironmentGroups(consoleGroup, project)
  }

  private async getOrCreateConsoleGroup(projectGroup: GroupRepresentation) {
    const consoleGroup = projectGroup.subGroups?.find(g => g.name === this.consoleGroupName)
    if (consoleGroup) return consoleGroup
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${projectGroup.name}`)
    }
    return this.keycloakService.getOrCreateChildGroupByName(projectGroup.id, this.consoleGroupName)
  }

  private async purgeOrphanEnvironmentGroups(consoleGroup: GroupRepresentation, project: ProjectWithDetails) {
    if (!consoleGroup.id) {
      throw new Error(`Failed to create or retrieve console group for ${project.slug}`)
    }

    // Get all current environment groups to detect deletions
    for await (const envGroup of this.keycloakService.getSubgroups(consoleGroup.id)) {
      if (!this.isOwnedEnvironmentGroup(envGroup, project) && envGroup.id) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          await this.keycloakService.deleteGroup(envGroup.id)
            .catch(e => this.logger.warn(`Failed to delete environment group ${envGroup.name}`, e))
        } else {
          this.logger.warn(`Environment group ${envGroup.name} detected but purge is disabled`)
        }
      }
    }
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
    if (!consoleGroup.id) {
      throw new Error(`Failed to create or retrieve console group for ${project.slug}`)
    }

    const envGroup = await this.keycloakService.getOrCreateChildGroupByName(consoleGroup.id, environment.name)
    if (!envGroup.id) {
      throw new Error(`Failed to create or retrieve environment group for ${environment.name}`)
    }

    const [roGroup, rwGroup] = await Promise.all([
      this.keycloakService.getOrCreateChildGroupByName(envGroup.id, 'RO'),
      this.keycloakService.getOrCreateChildGroupByName(envGroup.id, 'RW'),
    ])
    if (!roGroup.id || !rwGroup.id) {
      throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
    }

    const rolesById = resourceListToDict(project.roles)

    // Get current members of RO and RW groups to ensure we clean up removed users
    const [roMembers, rwMembers] = await Promise.all([
      this.keycloakService.listGroupMembers(roGroup.id),
      this.keycloakService.listGroupMembers(rwGroup.id),
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
    const promises: Promise<void>[] = []

    for (const userId of projectUserIds) {
      const perms = this.getUserPermissions(userId, project, rolesById)

      // Sync RO
      const isInRo = roMembers.some(m => m.id === userId)
      if (perms.ro && !isInRo) {
        promises.push(
          this.keycloakService.addUserToGroup(userId, roGroup.id)
            .then(() => this.logger.log(`User ${userId} added to RO group for ${environment.name}`))
            .catch(e => this.logger.warn(`Failed to add user ${userId} to RO group for ${environment.name}`, e)),
        )
      } else if (!perms.ro && isInRo) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          promises.push(
            this.keycloakService.removeUserFromGroup(userId, roGroup.id)
              .then(() => this.logger.log(`User ${userId} removed from RO group for ${environment.name}`))
              .catch(e => this.logger.warn(`Failed to remove user ${userId} from RO group for ${environment.name}`, e)),
          )
        } else {
          this.logger.warn(`User ${userId} has no RO permission but is in RO group for ${environment.name} (purge disabled)`)
        }
      }

      // Sync RW
      const isInRw = rwMembers.some(m => m.id === userId)
      if (perms.rw && !isInRw) {
        promises.push(
          this.keycloakService.addUserToGroup(userId, rwGroup.id)
            .then(() => this.logger.log(`User ${userId} added to RW group for ${environment.name}`))
            .catch(e => this.logger.warn(`Failed to add user ${userId} to RW group for ${environment.name}`, e)),
        )
      } else if (!perms.rw && isInRw) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          promises.push(
            this.keycloakService.removeUserFromGroup(userId, rwGroup.id)
              .then(() => this.logger.log(`User ${userId} removed from RW group for ${environment.name}`))
              .catch(e => this.logger.warn(`Failed to remove user ${userId} from RW group for ${environment.name}`, e)),
          )
        } else {
          this.logger.warn(`User ${userId} has no RW permission but is in RW group for ${environment.name} (purge disabled)`)
        }
      }
    }
  }

  private async purgeOrphanMembersFromEnvironment(
    environment: ProjectWithDetails['environments'][number],
    project: ProjectWithDetails,
    roGroup: GroupRepresentation,
    rwGroup: GroupRepresentation,
    roMembers: UserRepresentation[],
    rwMembers: UserRepresentation[],
  ) {
    if (!roGroup.id || !rwGroup.id) {
      throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
    }

    const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])
    const promises: Promise<void>[] = []

    for (const member of roMembers) {
      if (!projectUserIds.has(member.id!)) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          promises.push(
            this.keycloakService.removeUserFromGroup(member.id!, roGroup.id)
              .then(() => this.logger.log(`User ${member.id} removed from RO group for ${environment.name}`))
              .catch(e => this.logger.warn(`Failed to purge user ${member.id} from RO group for ${environment.name}`, e)),
          )
        } else {
          this.logger.warn(`User ${member.id} is in RO group for ${environment.name} but not in project (purge disabled)`)
        }
      }
    }

    for (const member of rwMembers) {
      if (!projectUserIds.has(member.id!)) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          promises.push(
            this.keycloakService.removeUserFromGroup(member.id!, rwGroup.id)
              .then(() => this.logger.log(`User ${member.id} removed from RW group for ${environment.name}`))
              .catch(e => this.logger.warn(`Failed to purge user ${member.id} from RW group for ${environment.name}`, e)),
          )
        } else {
          this.logger.warn(`User ${member.id} is in RW group for ${environment.name} but not in project (purge disabled)`)
        }
      }
    }
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
