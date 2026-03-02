import type { OnModuleInit } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ProjectAuthorized, getPermsByUserRoles, resourceListToDict } from '@cpn-console/shared'
import type { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import type { KeycloakService } from './keycloak.service'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js'
import type { KeycloakDatastoreService, ProjectWithDetails } from './keycloak-datastore.service'

export interface ReconciliationReport {
  summary: {
    total: number
    fulfilled: number
    rejected: number
  }
  results: PromiseSettledResult<any>[]
}

@Injectable()
export class KeycloakControllerService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakControllerService.name)
  private readonly consoleGroupName = 'console'

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly keycloakDatastore: KeycloakDatastoreService,
    private readonly configService: ConfigurationService,
  ) {
  }

  onModuleInit() {
    this.logger.log('KeycloakControllerService initialized')
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

  private async reconcile(): Promise<ReconciliationReport> {
    const results: PromiseSettledResult<any>[] = []
    try {
      const projects = await this.keycloakDatastore.getAllProjects()

      const projectGroupResults = await this.ensureProjectGroups(projects)
      results.push(...projectGroupResults)
      projectGroupResults.forEach((result) => {
        if (result.status === 'rejected') {
          this.logger.error(`Failed to ensure project group ${result.reason}`)
        }
      })

      const orphanResults = await this.purgeOrphanGroups(projects)
      results.push(...orphanResults)
    } catch (error) {
      this.logger.error('Failed to reconcile Keycloak state', error)
      results.push({ status: 'rejected', reason: error })
    }

    const summary = {
      total: results.length,
      fulfilled: results.filter(r => r.status === 'fulfilled').length,
      rejected: results.filter(r => r.status === 'rejected').length,
    }

    return { summary, results }
  }

  private ensureProjectGroups(projects: ProjectWithDetails[]) {
    return Promise.allSettled(projects.map(async (project) => {
      const projectGroup = await this.keycloakService.getOrCreateGroupByPath(`/${project.slug}`)
      const results = await Promise.all([
        this.ensureProjectGroup(projectGroup, project),
        this.ensureProjectRoleGroups(projectGroup, project),
        this.ensureEnvironmentGroups(projectGroup, project),
      ])
      return results.flat()
    }))
  }

  private async purgeOrphanGroups(projects: ProjectWithDetails[]) {
    const groups = this.keycloakService.getAllGroups()
    const projectSlugs = new Set(projects.map(p => p.slug))
    const promises: Promise<void>[] = []

    for await (const group of groups) {
      if (group.name && !projectSlugs.has(group.name)) {
        if (this.isOwnedConsoleGroup(group)) {
          if (this.configService.keycloakReconcilerPurgeOrphans) {
            if (group.id) {
              this.logger.log(`Deleting orphan Keycloak group: ${group.name}`)
              promises.push(
                this.keycloakService.deleteGroup(group.id)
                  .catch(error => this.logger.error(`Failed to delete orphan group ${group.name}`, error)),
              )
            } else {
              this.logger.warn(`Orphan Keycloak group detected but ID is missing: ${group.name}`)
            }
          } else {
            this.logger.warn(`Orphan Keycloak group detected but purge is disabled: ${group.name}`)
          }
        }
      }
    }
    return Promise.allSettled(promises)
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
    const groupMembers = await this.keycloakService.getGroupMembers(projectGroup.id)

    const results = await Promise.all([
      this.addMissingProjectMembers(projectGroup, project, groupMembers),
      this.deleteExtraProjectMembers(projectGroup, project, groupMembers),
    ])
    return results.flat()
  }

  private async addMissingProjectMembers(
    projectGroup: GroupRepresentation,
    project: ProjectWithDetails,
    members: UserRepresentation[],
  ) {
    const promises = project.members.map(async (member) => {
      if (!members.some(m => m.id === member.user.id)) {
        if (member.user.id && projectGroup.id) {
          await this.keycloakService.addUserToGroup(member.user.id, projectGroup.id)
        }
        this.logger.log(`Added ${member.user.email} to keycloak project group ${projectGroup.name}`)
      }
    })
    return Promise.allSettled([
      ...promises,
      this.addMissingOwner(projectGroup, project, members),
    ])
  }

  private async addMissingOwner(
    projectGroup: GroupRepresentation,
    project: ProjectWithDetails,
    members: UserRepresentation[],
  ) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    if (!members.some(m => m.id === project.ownerId)) {
      await this.keycloakService.addUserToGroup(project.ownerId, projectGroup.id)
      this.logger.log(`Added owner ${project.ownerId} to keycloak project group ${projectGroup.name}`)
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
    const promises = members.map(async (member) => {
      const isMember = project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
      if (!isMember) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          await this.keycloakService.removeUserFromGroup(member.id!, projectGroup.id!)
          this.logger.log(`Removed ${member.email} from keycloak project group ${projectGroup.name}`)
        } else {
          this.logger.warn(`User ${member.email} is in Keycloak group but not in project ${project.slug} (purge disabled)`)
        }
      }
    })
    return Promise.allSettled(promises)
  }

  private async ensureProjectRoleGroups(projectGroup: GroupRepresentation, project: ProjectWithDetails) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    return Promise.allSettled(project.roles.map(async (role) => {
      if (role.oidcGroup) {
        const roleGroup = await this.keycloakService.getOrCreateGroupByPath(role.oidcGroup)
        if (!roleGroup.id) {
          throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
        }
        const groupMembers = await this.keycloakService.getGroupMembers(roleGroup.id)
        if (roleGroup.id) {
          const results = await Promise.all([
            this.addMissingRoleMembers(roleGroup, project, role, groupMembers),
            this.deleteExtraRoleMembers(roleGroup, project, role, groupMembers),
          ])
          return results.flat()
        }
      }
      return []
    }))
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
    return Promise.allSettled(project.members.map(async (member) => {
      if (!members.some(m => m.id === member.user.id) && member.roleIds.includes(role.id)) {
        await this.keycloakService.addUserToGroup(member.user.id, roleGroup.id!)
        this.logger.log(`Added ${member.user.email} to keycloak role group ${roleGroup.name}`)
      }
    }))
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
    return Promise.allSettled(members.map(async (member) => {
      const isMember = project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
      if (!isMember && member.groups?.some(g => g === roleGroup.path)) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          await this.keycloakService.removeUserFromGroup(member.id!, roleGroup.id!)
          this.logger.log(`Removed ${member.email} from keycloak role group ${roleGroup.name}`)
        } else {
          this.logger.warn(`User ${member.email} is in Keycloak group but not in project ${project.slug} (purge disabled)`)
        }
      }
    }))
  }

  private async ensureEnvironmentGroups(projectGroup: GroupRepresentation, project: ProjectWithDetails) {
    const consoleGroup = await this.getOrCreateConsoleGroup(projectGroup)
    const envResults = await Promise.allSettled(project.environments.map(environment =>
      this.ensureEnvironmentGroup(consoleGroup, environment, project),
    ))
    const orphanResults = await this.purgeOrphanEnvironmentGroups(consoleGroup, project)
    return [...envResults, ...orphanResults]
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
    const promises: Promise<void>[] = []
    for await (const envGroup of this.keycloakService.getSubgroups(consoleGroup.id)) {
      if (!this.isOwnedEnvironmentGroup(envGroup, project) && envGroup.id) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          promises.push(
            this.keycloakService.deleteGroup(envGroup.id)
              .catch(e => this.logger.warn(`Failed to delete environment group ${envGroup.name}`, e)),
          )
        } else {
          this.logger.warn(`Environment group ${envGroup.name} detected but purge is disabled`)
        }
      }
    }
    return Promise.allSettled(promises)
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
      this.keycloakService.getGroupMembers(roGroup.id),
      this.keycloakService.getGroupMembers(rwGroup.id),
    ])

    const results = await Promise.all([
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
    return results.flat()
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

    return Promise.allSettled(Array.from(projectUserIds).map(async (userId) => {
      const perms = this.getUserPermissions(userId, project, rolesById)

      // Sync RO
      const isInRo = roMembers.some(m => m.id === userId)
      if (perms.ro && !isInRo) {
        await this.keycloakService.addUserToGroup(userId, roGroup.id!)
        this.logger.log(`User ${userId} added to RO group for ${environment.name}`)
      } else if (!perms.ro && isInRo) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          await this.keycloakService.removeUserFromGroup(userId, roGroup.id!)
          this.logger.log(`User ${userId} removed from RO group for ${environment.name}`)
        } else {
          this.logger.warn(`User ${userId} has no RO permission but is in RO group for ${environment.name} (purge disabled)`)
        }
      }

      // Sync RW
      const isInRw = rwMembers.some(m => m.id === userId)
      if (perms.rw && !isInRw) {
        await this.keycloakService.addUserToGroup(userId, rwGroup.id!)
        this.logger.log(`User ${userId} added to RW group for ${environment.name}`)
      } else if (!perms.rw && isInRw) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          await this.keycloakService.removeUserFromGroup(userId, rwGroup.id!)
          this.logger.log(`User ${userId} removed from RW group for ${environment.name}`)
        } else {
          this.logger.warn(`User ${userId} has no RW permission but is in RW group for ${environment.name} (purge disabled)`)
        }
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
    if (!roGroup.id || !rwGroup.id) {
      throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
    }

    const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])

    const roPromises = roMembers.map(async (member) => {
      if (!projectUserIds.has(member.id!)) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          await this.keycloakService.removeUserFromGroup(member.id!, roGroup.id!)
          this.logger.log(`User ${member.id} removed from RO group for ${environment.name}`)
        } else {
          this.logger.warn(`User ${member.id} is in RO group for ${environment.name} but not in project (purge disabled)`)
        }
      }
    })

    const rwPromises = rwMembers.map(async (member) => {
      if (!projectUserIds.has(member.id!)) {
        if (this.configService.keycloakReconcilerPurgeOrphans) {
          await this.keycloakService.removeUserFromGroup(member.id!, rwGroup.id!)
          this.logger.log(`User ${member.id} removed from RW group for ${environment.name}`)
        } else {
          this.logger.warn(`User ${member.id} is in RW group for ${environment.name} but not in project (purge disabled)`)
        }
      }
    })

    return Promise.allSettled([...roPromises, ...rwPromises])
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
