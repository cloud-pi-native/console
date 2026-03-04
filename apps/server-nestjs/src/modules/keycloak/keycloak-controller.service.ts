import type { OnModuleInit } from '@nestjs/common'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ProjectAuthorized, getPermsByUserRoles, resourceListToDict } from '@cpn-console/shared'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { KeycloakService } from './keycloak.service'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js'
import { KeycloakDatastoreService, type ProjectWithDetails } from './keycloak-datastore.service'
import { CONSOLE_GROUP_NAME } from './keycloak.constant'

@Injectable()
export class KeycloakControllerService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakControllerService.name)

  constructor(
    @Inject(KeycloakService) private readonly keycloak: KeycloakService,
    @Inject(KeycloakDatastoreService) private readonly keycloakDatastore: KeycloakDatastoreService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    this.logger.log('KeycloakControllerService initialized')
  }

  onModuleInit() {
    // this.handleCron()
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

  private async reconcile(): Promise<PromiseSettledResult<void>[]> {
    const results: PromiseSettledResult<void>[] = []
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
      orphanResults.forEach((result) => {
        if (result.status === 'rejected') {
          this.logger.error(`Failed to purge orphan group ${result.reason}`)
        }
      })
    } catch (error) {
      this.logger.error('Failed to reconcile Keycloak state', error)
      results.push({ status: 'rejected', reason: error })
    }

    return results
  }

  private async ensureProjectGroups(projects: ProjectWithDetails[]) {
    const results = await Promise.all(projects.map(async (project) => {
      try {
        const projectGroup = await this.keycloak.getOrCreateGroupByPath(`/${project.slug}`)
        const memberResults = await this.ensureProjectGroup(project, projectGroup)
        const subResults = await Promise.all([
          this.ensureProjectRoleGroups(project, projectGroup),
          this.ensureEnvironmentGroups(project, projectGroup),
        ])
        return [...memberResults, ...subResults.flat()]
      } catch (error) {
        return [{ status: 'rejected', reason: error }] as PromiseSettledResult<void>[]
      }
    }))
    return results.flat()
  }

  private async purgeOrphanGroups(projects: ProjectWithDetails[]) {
    const groups = this.keycloak.getAllGroups()
    const projectSlugs = new Set(projects.map(p => p.slug))
    const promises: Promise<void>[] = []

    for await (const group of groups) {
      if (group.name && !projectSlugs.has(group.name)) {
        if (this.isOwnedProjectGroup(group)) {
          if (this.config.keycloakControllerPurgeOrphanGroups) {
            if (group.id) {
              this.logger.log(`Deleting orphan Keycloak group: ${group.name}`)
              promises.push(
                this.keycloak.deleteGroup(group.id)
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

  private isOwnedProjectGroup(group: GroupRepresentation) {
    // Safety check: Only delete if it looks like a project group (has 'console' subgroup)
    // or if we can be sure it's not a system group.
    // For now, we rely on the 'console' subgroup heuristic as it's created by us.
    return !!group.subGroups?.some(sg => sg.name === CONSOLE_GROUP_NAME)
  }

  private async ensureProjectGroup(project: ProjectWithDetails, projectGroup: GroupRepresentation) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    const groupMembers = await this.keycloak.getGroupMembers(projectGroup.id)

    const results = await Promise.all([
      this.addMissingProjectMembers(project, projectGroup, groupMembers),
      this.deleteExtraProjectMembers(project, projectGroup, groupMembers),
    ])
    return results.flat()
  }

  private async addMissingProjectMembers(
    project: ProjectWithDetails,
    projectGroup: GroupRepresentation,
    members: UserRepresentation[],
  ) {
    const promises = project.members.map(async (member) => {
      if (!members.some(m => m.id === member.user.id)) {
        if (member.user.id && projectGroup.id) {
          await this.keycloak.addUserToGroup(member.user.id, projectGroup.id)
        }
        this.logger.log(`Added ${member.user.email} to keycloak project group ${projectGroup.name}`)
      }
    })
    return Promise.allSettled([
      ...promises,
      this.addMissingOwner(project, projectGroup, members),
    ])
  }

  private async addMissingOwner(
    project: ProjectWithDetails,
    projectGroup: GroupRepresentation,
    members: UserRepresentation[],
  ) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    if (!members.some(m => m.id === project.ownerId)) {
      await this.keycloak.addUserToGroup(project.ownerId, projectGroup.id)
      this.logger.log(`Added owner ${project.ownerId} to keycloak project group ${projectGroup.name}`)
    }
  }

  private async deleteExtraProjectMembers(
    project: ProjectWithDetails,
    projectGroup: GroupRepresentation,
    members: UserRepresentation[],
  ) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${project.slug}`)
    }
    const promises = members.map(async (member) => {
      const isMember = project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
      if (!isMember) {
        if (this.config.keycloakControllerPurgeOrphanMembers) {
          await this.keycloak.removeUserFromGroup(member.id!, projectGroup.id!)
          this.logger.log(`Removed ${member.email} from keycloak project group ${projectGroup.name}`)
        } else {
          this.logger.warn(`User ${member.email} is in Keycloak group but not in project ${project.slug} (purge disabled)`)
        }
      }
    })
    return Promise.allSettled(promises)
  }

  private async ensureProjectRoleGroups(project: ProjectWithDetails, projectGroup: GroupRepresentation): Promise<PromiseSettledResult<void>[]> {
    if (!projectGroup.id) {
      return [{ status: 'rejected', reason: new Error(`Failed to create or retrieve project group for ${project.slug}`) }]
    }
    const results = await Promise.all(project.roles.map(async (role) => {
      if (role.oidcGroup) {
        try {
          const roleGroup = await this.keycloak.getOrCreateGroupByPath(role.oidcGroup)
          if (!roleGroup.id) {
            throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
          }
          const groupMembers = await this.keycloak.getGroupMembers(roleGroup.id)
          const results = await Promise.all([
            this.addMissingRoleMembers(roleGroup, project, role, groupMembers),
            this.deleteExtraRoleMembers(roleGroup, project, role, groupMembers),
          ])
          return results.flat()
        } catch (error) {
          return [{ status: 'rejected', reason: error }] as PromiseSettledResult<void>[]
        }
      }
      return []
    }))
    return results.flat()
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
        await this.keycloak.addUserToGroup(member.user.id, roleGroup.id!)
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
        if (this.config.keycloakControllerPurgeOrphanMembers) {
          await this.keycloak.removeUserFromGroup(member.id!, roleGroup.id!)
          this.logger.log(`Removed ${member.email} from keycloak role group ${roleGroup.name}`)
        } else {
          this.logger.warn(`User ${member.email} is in Keycloak group but not in project ${project.slug} (purge disabled)`)
        }
      }
    }))
  }

  private async ensureEnvironmentGroups(project: ProjectWithDetails, projectGroup: GroupRepresentation): Promise<PromiseSettledResult<void>[]> {
    try {
      const consoleGroup = await this.keycloak.getOrCreateConsoleGroup(projectGroup)
      const envResults = await Promise.all(project.environments.map(environment =>
        this.ensureEnvironmentGroup(consoleGroup, environment, project)))
      const orphanResults = await this.purgeOrphanEnvironmentGroups(consoleGroup, project)
      return [...envResults.flat(), ...orphanResults]
    } catch (error) {
      return [{ status: 'rejected', reason: error }] satisfies PromiseSettledResult<void>[]
    }
  }

  private async purgeOrphanEnvironmentGroups(consoleGroup: GroupRepresentation, project: ProjectWithDetails) {
    if (!consoleGroup.id) {
      throw new Error(`Failed to create or retrieve console group for ${project.slug}`)
    }
    const promises: Promise<void>[] = []
    for await (const envGroup of this.keycloak.getSubGroups(consoleGroup.id)) {
      if (!this.isOwnedEnvironmentGroup(envGroup, project) && envGroup.id) {
        if (this.config.keycloakControllerPurgeOrphanGroups) {
          promises.push(
            this.keycloak.deleteGroup(envGroup.id)
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
        await this.keycloak.addUserToGroup(userId, roGroup.id!)
        this.logger.log(`User ${userId} added to RO group for ${environment.name}`)
      } else if (!perms.ro && isInRo) {
        if (this.config.keycloakControllerPurgeOrphanMembers) {
          await this.keycloak.removeUserFromGroup(userId, roGroup.id!)
          this.logger.log(`User ${userId} removed from RO group for ${environment.name}`)
        } else {
          this.logger.warn(`User ${userId} has no RO permission but is in RO group for ${environment.name} (purge disabled)`)
        }
      }

      // Sync RW
      const isInRw = rwMembers.some(m => m.id === userId)
      if (perms.rw && !isInRw) {
        await this.keycloak.addUserToGroup(userId, rwGroup.id!)
        this.logger.log(`User ${userId} added to RW group for ${environment.name}`)
      } else if (!perms.rw && isInRw) {
        if (this.config.keycloakControllerPurgeOrphanMembers) {
          await this.keycloak.removeUserFromGroup(userId, rwGroup.id!)
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
        if (this.config.keycloakControllerPurgeOrphanMembers) {
          await this.keycloak.removeUserFromGroup(member.id!, roGroup.id!)
          this.logger.log(`User ${member.id} removed from RO group for ${environment.name}`)
        } else {
          this.logger.warn(`User ${member.id} is in RO group for ${environment.name} but not in project (purge disabled)`)
        }
      }
    })

    const rwPromises = rwMembers.map(async (member) => {
      if (!projectUserIds.has(member.id!)) {
        if (this.config.keycloakControllerPurgeOrphanMembers) {
          await this.keycloak.removeUserFromGroup(member.id!, rwGroup.id!)
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
