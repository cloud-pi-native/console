import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ProjectAuthorized, getPermsByUserRoles, resourceListToDict } from '@cpn-console/shared'
import { KeycloakService } from './keycloak.service'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import { CONSOLE_GROUP_NAME } from './keycloak.constant'
import type { GroupRepresentationWith } from './keycloack.utils'
import { isMember } from './keycloack.utils'
import { trace } from '@opentelemetry/api'
import z from 'zod'

const tracer = trace.getTracer('keycloak-controller')

@Injectable()
export class KeycloakControllerService {
  private readonly logger = new Logger(KeycloakControllerService.name)

  constructor(
    @Inject(KeycloakService) private readonly keycloak: KeycloakService,
    @Inject(KeycloakDatastoreService) private readonly keycloakDatastore: KeycloakDatastoreService,
  ) {
    this.logger.log('KeycloakControllerService initialized')
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

  private async ensureProjectGroups(projects: ProjectWithDetails[]) {
    return tracer.startActiveSpan('ensureProjectGroups', async (span) => {
      try {
        span.setAttribute('projects.count', projects.length)
        await Promise.all(projects.map(project => this.ensureProjectGroup(project)))
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async ensureProjectGroup(project: ProjectWithDetails) {
    return tracer.startActiveSpan('ensureProjectGroup', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('project.members.count', project.members.length)
        span.setAttribute('project.roles.count', project.roles.length)
        span.setAttribute('project.environments.count', project.environments.length)

        const projectGroup = z.object({
          id: z.string(),
          name: z.string(),
        }).parse(await this.keycloak.getOrCreateGroupByPath(`/${project.slug}`))

        span.setAttribute('keycloak.project_group.id', projectGroup.id)

        await Promise.all([
          this.ensureProjectGroupMembers(project, projectGroup),
          this.ensureProjectRoleGroups(project),
          this.ensureConsoleGroup(project, projectGroup),
        ])

        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async ensureConsoleGroup(project: ProjectWithDetails, group: GroupRepresentationWith<'id'>) {
    const consoleGroup = z.object({
      id: z.string(),
      name: z.string(),
    }).parse(await this.keycloak.getOrCreateConsoleGroup(group))
    await Promise.all([
      this.ensureEnvironmentGroups(project, consoleGroup),
      this.purgeOrphanEnvironmentGroups(project, consoleGroup),
    ])
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
    } catch (e) {
      if (e.response?.status === 404) {
        this.logger.warn(`User ${userId} not found in Keycloak, skipping addition to group ${groupName}`)
      } else if (e.response?.status === 409) {
        this.logger.debug(`User ${userId} is already a member of keycloak group ${groupName}`)
      } else {
        throw e
      }
    }
  }

  private async maybeRemoveUserFromGroup(userId: string, groupId: string, groupName: string) {
    try {
      await this.keycloak.removeUserFromGroup(userId, groupId)
      this.logger.log(`Removed ${userId} from keycloak group ${groupName}`)
    } catch (e) {
      if (e.response?.status === 404) {
        this.logger.warn(`User ${userId} not found in Keycloak, skipping removal from group ${groupName}`)
      } else {
        throw e
      }
    }
  }

  private async ensureProjectGroupMembers(
    project: ProjectWithDetails,
    projectGroup: GroupRepresentationWith<'id' | 'name'>,
  ) {
    return tracer.startActiveSpan('ensureProjectGroupMembers', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('keycloak.group.id', projectGroup.id)

        const groupMembers = await this.keycloak.getGroupMembers(projectGroup.id)
        const desiredUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])

        span.setAttribute('keycloak.group.members.current', groupMembers.length)
        span.setAttribute('keycloak.group.members.desired', desiredUserIds.size)

        let addedCount = 0
        let removedCount = 0

        await Promise.all([
          ...Array.from(desiredUserIds, async (userId) => {
            if (!groupMembers.some(m => m.id === userId)) {
              addedCount++
              await this.maybeAddUserToGroup(userId, projectGroup.id, projectGroup.name)
            }
          }),
          ...groupMembers.map(async (member) => {
            if (member.id && !desiredUserIds.has(member.id)) {
              removedCount++
              await this.maybeRemoveUserFromGroup(member.id, projectGroup.id, projectGroup.name)
            }
          }),
        ])

        span.setAttribute('keycloak.group.members.added', addedCount)
        span.setAttribute('keycloak.group.members.removed', removedCount)

        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async ensureProjectRoleGroups(project: ProjectWithDetails) {
    return tracer.startActiveSpan('ensureProjectRoleGroups', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('project.roles.count', project.roles.length)

        const rolesWithOidcGroup = project.roles.filter(r => !!r.oidcGroup).length
        span.setAttribute('project.roles.oidc_group.count', rolesWithOidcGroup)

        await Promise.all(project.roles.map(async (role) => {
          if (!role.oidcGroup) return

          return tracer.startActiveSpan('ensureProjectRoleGroup', async (roleSpan) => {
            try {
              roleSpan.setAttribute('project.slug', project.slug)
              roleSpan.setAttribute('role.id', role.id)
              roleSpan.setAttribute('role.type', role.type)
              roleSpan.setAttribute('role.oidc_group', role.oidcGroup)

              const roleGroup = z.object({
                id: z.string(),
                name: z.string(),
                path: z.string(),
              }).parse(await this.keycloak.getOrCreateGroupByPath(role.oidcGroup))
              roleSpan.setAttribute('keycloak.role_group.id', roleGroup.id)
              roleSpan.setAttribute('keycloak.role_group.path', roleGroup.path)

              const groupMembers = await this.keycloak.getGroupMembers(roleGroup.id)
              roleSpan.setAttribute('keycloak.role_group.members.current', groupMembers.length)

              switch (role.type) {
                case 'managed':
                  await Promise.all([
                    this.ensureProjectRoleGroupMembers(project, role, roleGroup, groupMembers),
                    this.purgeOrphanProjectRoleGroupMembers(project, role, roleGroup, groupMembers),
                  ])
                  break
                case 'external':
                  await this.ensureProjectRoleGroupMembers(project, role, roleGroup, groupMembers)
                  break
                case 'global':
                  await this.ensureProjectRoleGroupMembers(project, role, roleGroup, groupMembers)
                  break
              }

              roleSpan.end()
            } catch (error) {
              if (error instanceof Error) roleSpan.recordException(error)
              roleSpan.end()
              throw error
            }
          })
        }))

        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async ensureProjectRoleGroupMembers(
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    group: GroupRepresentationWith<'id' | 'name' | 'path'>,
    members: UserRepresentation[],
  ) {
    return tracer.startActiveSpan('ensureProjectRoleGroupMembers', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('role.id', role.id)
        span.setAttribute('role.type', role.type)
        span.setAttribute('keycloak.group.id', group.id)
        span.setAttribute('keycloak.group.members.current', members.length)

        const desiredMemberIds = project.members
          .filter(m => m.roleIds.includes(role.id))
          .map(m => m.user.id)

        span.setAttribute('keycloak.group.members.desired', desiredMemberIds.length)

        let addedCount = 0
        await Promise.all(project.members.map(async (member) => {
          if (!members.some(m => m.id === member.user.id) && member.roleIds.includes(role.id)) {
            addedCount++
            await this.maybeAddUserToGroup(member.user.id, group.id, group.name)
          }
        }))

        span.setAttribute('keycloak.group.members.added', addedCount)
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async purgeOrphanProjectRoleGroupMembers(
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    group: GroupRepresentationWith<'id' | 'name' | 'path'>,
    members: UserRepresentation[],
  ) {
    return tracer.startActiveSpan('purgeOrphanProjectRoleGroupMembers', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('role.id', role.id)
        span.setAttribute('role.type', role.type)
        span.setAttribute('keycloak.group.id', group.id)
        span.setAttribute('keycloak.group.members.current', members.length)

        let removedCount = 0
        await Promise.all(members.map(async (member) => {
          if (!isMember(project, member) && member.groups?.includes(group.path)) {
            if (!member.id) {
              throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
            }
            removedCount++
            await this.maybeRemoveUserFromGroup(member.id, group.id, group.name)
          }
        }))
        span.setAttribute('keycloak.group.members.removed', removedCount)
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async ensureEnvironmentGroups(
    project: ProjectWithDetails,
    group: GroupRepresentationWith<'id'>,
  ) {
    await Promise.all(project.environments.map(environment =>
      this.ensureEnvironmentGroup(project, environment, group)))
  }

  private async ensureEnvironmentGroup(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
    group: GroupRepresentationWith<'id'>,
  ) {
    return tracer.startActiveSpan('ensureEnvironmentGroup', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('environment.id', environment.id)
        span.setAttribute('environment.name', environment.name)
        span.setAttribute('project.roles.count', project.roles.length)

        const { roGroup, rwGroup } = z.object({
          roGroup: z.object({
            id: z.string(),
            name: z.string(),
          }),
          rwGroup: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }).parse(await this.keycloak.getOrCreateEnvironmentGroups(group, environment))

        span.setAttribute('keycloak.env_group.ro.id', roGroup.id)
        span.setAttribute('keycloak.env_group.rw.id', rwGroup.id)

        const rolesById = resourceListToDict(project.roles)

        const [roMembers, rwMembers] = await Promise.all([
          this.keycloak.getGroupMembers(roGroup.id),
          this.keycloak.getGroupMembers(rwGroup.id),
        ])

        span.setAttribute('keycloak.env_group.ro.members.current', roMembers.length)
        span.setAttribute('keycloak.env_group.rw.members.current', rwMembers.length)

        await Promise.all([
          this.ensureEnvironmentGroupMembers(
            project,
            environment,
            rolesById,
            roGroup,
            rwGroup,
            roMembers,
            rwMembers,
          ),
          this.purgeOrphanEnvironmentGroupMembers(
            project,
            environment,
            roGroup,
            rwGroup,
            roMembers,
            rwMembers,
          ),
        ])

        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async ensureEnvironmentGroupMembers(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
    rolesById: Record<string, ProjectWithDetails['roles'][number]>,
    roGroup: GroupRepresentationWith<'id'>,
    rwGroup: GroupRepresentationWith<'id'>,
    roMembers: UserRepresentation[],
    rwMembers: UserRepresentation[],
  ) {
    return tracer.startActiveSpan('ensureEnvironmentGroupMembers', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('environment.id', environment.id)
        span.setAttribute('environment.name', environment.name)
        span.setAttribute('keycloak.env_group.ro.id', roGroup.id)
        span.setAttribute('keycloak.env_group.rw.id', rwGroup.id)
        span.setAttribute('keycloak.env_group.ro.members.current', roMembers.length)
        span.setAttribute('keycloak.env_group.rw.members.current', rwMembers.length)

        const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])
        span.setAttribute('project.users.count', projectUserIds.size)

        let roAdded = 0
        let roRemoved = 0
        let rwAdded = 0
        let rwRemoved = 0

        await Promise.all(Array.from(projectUserIds, async (userId) => {
          const perms = this.getUserPermissions(project, rolesById, userId)

          const isInRo = roMembers.some(m => m.id === userId)
          if (perms.ro && !isInRo) {
            roAdded++
            await this.maybeAddUserToGroup(userId, roGroup.id, `RO group for ${environment.name}`)
          } else if (!perms.ro && isInRo) {
            roRemoved++
            await this.maybeRemoveUserFromGroup(userId, roGroup.id, `RO group for ${environment.name}`)
          }

          const isInRw = rwMembers.some(m => m.id === userId)
          if (perms.rw && !isInRw) {
            rwAdded++
            await this.maybeAddUserToGroup(userId, rwGroup.id, `RW group for ${environment.name}`)
          } else if (!perms.rw && isInRw) {
            rwRemoved++
            await this.maybeRemoveUserFromGroup(userId, rwGroup.id, `RW group for ${environment.name}`)
          }
        }))

        span.setAttribute('keycloak.env_group.ro.members.added', roAdded)
        span.setAttribute('keycloak.env_group.ro.members.removed', roRemoved)
        span.setAttribute('keycloak.env_group.rw.members.added', rwAdded)
        span.setAttribute('keycloak.env_group.rw.members.removed', rwRemoved)

        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async purgeOrphanEnvironmentGroupMembers(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
    roGroup: GroupRepresentationWith<'id'>,
    rwGroup: GroupRepresentationWith<'id'>,
    roMembers: UserRepresentation[],
    rwMembers: UserRepresentation[],
  ) {
    return tracer.startActiveSpan('purgeOrphanEnvironmentGroupMembers', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('environment.id', environment.id)
        span.setAttribute('environment.name', environment.name)
        span.setAttribute('keycloak.env_group.ro.id', roGroup.id)
        span.setAttribute('keycloak.env_group.rw.id', rwGroup.id)
        span.setAttribute('keycloak.env_group.ro.members.current', roMembers.length)
        span.setAttribute('keycloak.env_group.rw.members.current', rwMembers.length)

        const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])

        let roRemoved = 0
        let rwRemoved = 0

        await Promise.all([
          ...roMembers.map(async (member) => {
            if (!member.id) {
              throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
            }
            if (!projectUserIds.has(member.id)) {
              roRemoved++
              await this.maybeRemoveUserFromGroup(member.id, roGroup.id, `RO group for ${environment.name}`)
            }
          }),
          ...rwMembers.map(async (member) => {
            if (!member.id) {
              throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
            }
            if (!projectUserIds.has(member.id)) {
              rwRemoved++
              await this.maybeRemoveUserFromGroup(member.id, rwGroup.id, `RW group for ${environment.name}`)
            }
          }),
        ])

        span.setAttribute('keycloak.env_group.ro.members.removed', roRemoved)
        span.setAttribute('keycloak.env_group.rw.members.removed', rwRemoved)
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async purgeOrphanEnvironmentGroups(
    project: ProjectWithDetails,
    group: GroupRepresentationWith<'id' | 'name'>,
  ) {
    const promises: Promise<void>[] = []

    for await (const envGroup of this.keycloak.getSubGroups(group.id)) {
      if (!this.isOwnedEnvironmentGroup(project, group) && envGroup.id) {
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
    project: ProjectWithDetails,
    group: GroupRepresentationWith<'name'>,
  ) {
    return project.environments.some(e => e.name === group.name)
  }

  private getUserPermissions(
    project: ProjectWithDetails,
    rolesById: Record<string, ProjectWithDetails['roles'][number]>,
    userId: string,
  ) {
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
