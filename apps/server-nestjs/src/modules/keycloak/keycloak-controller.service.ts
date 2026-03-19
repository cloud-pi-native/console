import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation'
import type { GroupRepresentationWith } from './keycloak-client.service'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import { getPermsByUserRoles, ProjectAuthorized, resourceListToDict } from '@cpn-console/shared'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import z from 'zod'
import { Reconcile } from '../../cpin-module/infrastructure/reconcile/reconcile.decorator'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { CONSOLE_GROUP_NAME } from './keycloak.constants'

@Injectable()
export class KeycloakControllerService {
  private readonly logger = new Logger(KeycloakControllerService.name)

  constructor(
    @Inject(KeycloakClientService) private readonly keycloak: KeycloakClientService,
    @Inject(KeycloakDatastoreService) private readonly keycloakDatastore: KeycloakDatastoreService,
  ) {
    this.logger.log('KeycloakControllerService initialized')
  }

  @OnEvent('project.upsert')
  @Reconcile()
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project upsert for ${project.slug}`)
    await this.ensureProjectGroups([project])
  }

  @OnEvent('project.delete')
  @Reconcile()
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.purgeOrphanGroups([project])
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    this.logger.log('Starting periodic Keycloak reconciliation')
    const projects = await this.keycloakDatastore.getAllProjects()
    span?.setAttribute('keycloak.projects.count', projects.length)
    this.logger.debug(`Reconciling ${projects.length} projects`)
    await this.ensureProjectGroups(projects)
    await this.purgeOrphanGroups(projects)
  }

  @StartActiveSpan()
  private async ensureProjectGroups(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.projects.count', projects.length)
    await Promise.all(projects.map(project => this.ensureProjectGroup(project)))
  }

  @StartActiveSpan()
  private async ensureProjectGroup(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'project.members.count': project.members.length,
      'project.roles.count': project.roles.length,
      'project.environments.count': project.environments.length,
    })

    const projectGroup = z.object({
      id: z.string(),
      name: z.string(),
    }).parse(await this.keycloak.getOrCreateGroupByPath(`/${project.slug}`))

    span?.setAttribute('keycloak.project_group.id', projectGroup.id)

    await Promise.all([
      this.ensureProjectGroupMembers(project, projectGroup),
      this.ensureConsoleGroup(project, projectGroup),
    ])
  }

  @StartActiveSpan()
  private async ensureConsoleGroup(project: ProjectWithDetails, group: GroupRepresentationWith<'id'>) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.console_group.id', group.id)
    const consoleGroup = z.object({
      id: z.string(),
      name: z.string(),
    }).parse(await this.keycloak.getOrCreateConsoleGroup(group))
    await Promise.all([
      this.ensureRoleGroups(project, consoleGroup),
      this.ensureEnvironmentGroups(project, consoleGroup),
      this.purgeOrphanEnvironmentGroups(project, consoleGroup),
    ])
  }

  @StartActiveSpan()
  private async purgeOrphanGroups(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    const groups = map(this.keycloak.getAllGroups(), async (group) => {
      return z.object({
        id: z.string(),
        name: z.string(),
        subGroups: z.array(z.object({ name: z.string() })),
      }).parse(group)
    })
    const projectSlugs = new Set(projects.map(p => p.slug))
    const promises: Promise<void>[] = []
    let purgedCount = 0

    for await (const group of groups) {
      if (!projectSlugs.has(group.name)) {
        if (this.isOwnedProjectGroup(group)) {
          this.logger.log(`Deleting orphan Keycloak group: ${group.name}`)
          purgedCount++
          promises.push(this.keycloak.deleteGroup(group.id))
        }
      }
    }
    span?.setAttribute('purged.count', purgedCount)
    await Promise.all(promises)
  }

  private isOwnedProjectGroup(group: GroupRepresentationWith<'subGroups'>) {
    // Safety check: Only delete if it looks like a project group (has 'console' subgroup)
    // or if we can be sure it's not a system group.
    // For now, we rely on the 'console' subgroup heuristic as it's created by us.
    return !!group.subGroups.some(sg => sg.name === CONSOLE_GROUP_NAME)
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

  @StartActiveSpan()
  private async ensureProjectGroupMembers(
    project: ProjectWithDetails,
    group: GroupRepresentationWith<'id' | 'name'>,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('keycloak.group.id', group.id)

    const groupMembers = await this.keycloak.getGroupMembers(group.id)
    const desiredUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])

    span?.setAttribute('keycloak.group.members.current', groupMembers.length)
    span?.setAttribute('keycloak.group.members.desired', desiredUserIds.size)

    let addedCount = 0
    let removedCount = 0

    await Promise.all([
      ...Array.from(desiredUserIds, async (userId) => {
        if (!groupMembers.some(m => m.id === userId)) {
          addedCount++
          await this.maybeAddUserToGroup(userId, group.id, group.name)
        }
      }),
      ...groupMembers.map(async (member) => {
        if (member.id && !desiredUserIds.has(member.id)) {
          removedCount++
          await this.maybeRemoveUserFromGroup(member.id, group.id, group.name)
        }
      }),
    ])

    span?.setAttribute('keycloak.group.members.added', addedCount)
    span?.setAttribute('keycloak.group.members.removed', removedCount)
  }

  @StartActiveSpan()
  private async ensureRoleGroups(
    project: ProjectWithDetails,
    group: GroupRepresentationWith<'id' | 'name'>,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'keycloak.group.id': group.id,
      'project.roles.count': project.roles.length,
    })

    const rolesWithOidcGroup = project.roles.filter(r => !!r.oidcGroup).length
    span?.setAttribute('project.roles.oidc_group.count', rolesWithOidcGroup)

    await Promise.all(project.roles.map(role => this.ensureRoleGroup(project, role, group)))
  }

  @StartActiveSpan()
  private async ensureRoleGroup(
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    group: GroupRepresentationWith<'id' | 'name'>,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('role.id', role.id)
    span?.setAttribute('role.type', role.type)
    span?.setAttribute('role.oidc_group.present', !!role.oidcGroup)
    if (role.oidcGroup) {
      span?.setAttribute('role.oidc_group.depth', role.oidcGroup.split('/').filter(Boolean).length)
    }

    const roleGroup = await this.keycloak.getOrCreateRoleGroup(group, role.oidcGroup)
    span?.setAttribute('keycloak.group.id', roleGroup.id)
    span?.setAttribute('keycloak.group.path', roleGroup.path)

    const groupMembers = await this.keycloak.getGroupMembers(roleGroup.id)
    span?.setAttribute('keycloak.group.members.current', groupMembers.length)

    switch (role.type) {
      case 'managed':
        await Promise.all([
          this.ensureRoleGroupMembers(project, role, roleGroup, groupMembers),
          this.purgeOrphanRoleGroupMembers(project, role, roleGroup, groupMembers),
        ])
        break
      case 'external':
        await this.ensureRoleGroupMembers(project, role, roleGroup, groupMembers)
        break
      case 'global':
        await this.ensureRoleGroupMembers(project, role, roleGroup, groupMembers)
        break
      default:
        throw new Error(`Unknown role type ${role.type}`)
    }
  }

  @StartActiveSpan()
  private async ensureRoleGroupMembers(
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    group: GroupRepresentationWith<'id' | 'name' | 'path'>,
    members: UserRepresentation[],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('role.id', role.id)
    span?.setAttribute('role.type', role.type)
    span?.setAttribute('keycloak.group.id', group.id)
    span?.setAttribute('keycloak.group.members.current', members.length)

    const desiredMemberIds = project.members
      .filter(m => m.roleIds.includes(role.id))
      .map(m => m.user.id)

    span?.setAttribute('keycloak.group.members.desired', desiredMemberIds.length)

    let addedCount = 0
    await Promise.all(project.members.map(async (member) => {
      if (!members.some(m => m.id === member.user.id) && member.roleIds.includes(role.id)) {
        addedCount++
        await this.maybeAddUserToGroup(member.user.id, group.id, group.name)
      }
    }))

    span?.setAttribute('keycloak.group.members.added', addedCount)
  }

  @StartActiveSpan()
  private async purgeOrphanRoleGroupMembers(
    project: ProjectWithDetails,
    role: ProjectWithDetails['roles'][number],
    group: GroupRepresentationWith<'id' | 'name' | 'path'>,
    members: UserRepresentation[],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('role.id', role.id)
    span?.setAttribute('role.type', role.type)
    span?.setAttribute('keycloak.group.id', group.id)
    span?.setAttribute('keycloak.group.members.current', members.length)

    let removedCount = 0
    await Promise.all(members.map(async (member) => {
      if (!isMember(project, member)) {
        if (!member.id) {
          throw new Error(`Failed to create or retrieve role group for ${role.oidcGroup}`)
        }
        removedCount++
        await this.maybeRemoveUserFromGroup(member.id, group.id, group.name)
      }
    }))
    span?.setAttribute('keycloak.group.members.removed', removedCount)
  }

  private async ensureEnvironmentGroups(
    project: ProjectWithDetails,
    group: GroupRepresentationWith<'id'>,
  ) {
    await Promise.all(project.environments.map(environment =>
      this.ensureEnvironmentGroup(project, environment, group)))
  }

  @StartActiveSpan()
  private async ensureEnvironmentGroup(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
    group: GroupRepresentationWith<'id'>,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'environment.id': environment.id,
      'environment.name': environment.name,
      'project.roles.count': project.roles.length,
    })

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

    span?.setAttribute('keycloak.env_group.ro.id', roGroup.id)
    span?.setAttribute('keycloak.env_group.rw.id', rwGroup.id)

    const rolesById = resourceListToDict(project.roles)

    const [roMembers, rwMembers] = await Promise.all([
      this.keycloak.getGroupMembers(roGroup.id),
      this.keycloak.getGroupMembers(rwGroup.id),
    ])

    span?.setAttribute('keycloak.env_group.ro.members.current', roMembers.length)
    span?.setAttribute('keycloak.env_group.rw.members.current', rwMembers.length)

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
  }

  @StartActiveSpan()
  private async ensureEnvironmentGroupMembers(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
    rolesById: Record<string, ProjectWithDetails['roles'][number]>,
    roGroup: GroupRepresentationWith<'id'>,
    rwGroup: GroupRepresentationWith<'id'>,
    roMembers: UserRepresentation[],
    rwMembers: UserRepresentation[],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('environment.id', environment.id)
    span?.setAttribute('environment.name', environment.name)
    span?.setAttribute('keycloak.env_group.ro.id', roGroup.id)
    span?.setAttribute('keycloak.env_group.rw.id', rwGroup.id)
    span?.setAttribute('keycloak.env_group.ro.members.current', roMembers.length)
    span?.setAttribute('keycloak.env_group.rw.members.current', rwMembers.length)

    const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])
    span?.setAttribute('project.users.count', projectUserIds.size)

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

    span?.setAttribute('keycloak.env_group.ro.members.added', roAdded)
    span?.setAttribute('keycloak.env_group.ro.members.removed', roRemoved)
    span?.setAttribute('keycloak.env_group.rw.members.added', rwAdded)
    span?.setAttribute('keycloak.env_group.rw.members.removed', rwRemoved)
  }

  @StartActiveSpan()
  private async purgeOrphanEnvironmentGroupMembers(
    project: ProjectWithDetails,
    environment: ProjectWithDetails['environments'][number],
    roGroup: GroupRepresentationWith<'id'>,
    rwGroup: GroupRepresentationWith<'id'>,
    roMembers: UserRepresentation[],
    rwMembers: UserRepresentation[],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('environment.id', environment.id)
    span?.setAttribute('environment.name', environment.name)
    span?.setAttribute('keycloak.env_group.ro.id', roGroup.id)
    span?.setAttribute('keycloak.env_group.rw.id', rwGroup.id)
    span?.setAttribute('keycloak.env_group.ro.members.current', roMembers.length)
    span?.setAttribute('keycloak.env_group.rw.members.current', rwMembers.length)

    const projectUserIds = new Set([project.ownerId, ...project.members.map(m => m.user.id)])
    span?.setAttribute('project.users.count', projectUserIds.size)

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

    span?.setAttribute('keycloak.env_group.ro.members.removed', roRemoved)
    span?.setAttribute('keycloak.env_group.rw.members.removed', rwRemoved)
  }

  @StartActiveSpan()
  private async purgeOrphanEnvironmentGroups(
    project: ProjectWithDetails,
    group: GroupRepresentationWith<'id' | 'name'>,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('keycloak.group.id', group.id)
    span?.setAttribute('keycloak.group.name', group.name)

    const envGroups = map(this.keycloak.getSubGroups(group.id), envGroup => z.object({
      id: z.string(),
      name: z.string(),
    }).parse(envGroup))

    const promises: Promise<void>[] = []
    let orphanCount = 0

    for await (const envGroup of envGroups) {
      span?.setAttribute('keycloak.env_group.id', envGroup.id)
      span?.setAttribute('keycloak.env_group.name', envGroup.name)

      const subGroups = await getAll(map(this.keycloak.getSubGroups(envGroup.id), subgroup => z.object({
        name: z.string(),
      }).parse(subgroup)))

      if (this.isEnvironmentGroup(subGroups) && !this.isOwnedEnvironmentGroup(project, envGroup)) {
        orphanCount++
        this.logger.log(`Deleting orphan environment group ${envGroup.name} for project ${project.slug}`)
        promises.push(
          this.keycloak.deleteGroup(envGroup.id)
            .catch(e => this.logger.warn(`Failed to delete environment group ${envGroup.name} for project ${project.slug}`, e)),
        )
      }
    }

    span?.setAttribute('keycloak.env_groups.orphan.count', orphanCount)
    await Promise.all(promises)
  }

  private isEnvironmentGroup(
    subGroups: GroupRepresentationWith<'name'>[],
  ) {
    return subGroups.some(subgroup => subgroup.name === 'RO' || subgroup.name === 'RW')
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

export function isMember(project: ProjectWithDetails, member: UserRepresentation) {
  return project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
}

async function* map<T, U>(
  iterable: AsyncIterable<T>,
  mapper: (value: T, index: number) => U | Promise<U>,
): AsyncIterable<U> {
  let index = 0
  for await (const value of iterable) {
    yield await mapper(value, index++)
  }
}

async function getAll<T>(
  iterable: AsyncIterable<T>,
): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterable) {
    items.push(item)
  }
  return items
}
