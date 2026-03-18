import { Inject, Injectable, Logger } from '@nestjs/common'
import type { OnModuleInit } from '@nestjs/common'
import type KcAdminClient from '@keycloak/keycloak-admin-client'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { trace } from '@opentelemetry/api'
import z from 'zod'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import { CONSOLE_GROUP_NAME, SUBGROUPS_PAGINATE_QUERY_MAX } from './keycloak.constants'

export type GroupRepresentationWith<T extends keyof GroupRepresentation> = GroupRepresentation & Required<Pick<GroupRepresentation, T>>

export const KEYCLOAK_ADMIN_CLIENT = Symbol('KEYCLOAK_ADMIN_CLIENT')

@Injectable()
export class KeycloakClientService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakClientService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(KEYCLOAK_ADMIN_CLIENT) private readonly client: KcAdminClient,
  ) {
  }

  async* getAllGroups() {
    let first = 0
    while (true) {
      const fetched = await this.client.groups.find({ first, max: SUBGROUPS_PAGINATE_QUERY_MAX, briefRepresentation: false })
      if (fetched.length === 0) break
      for (const group of fetched) {
        yield group
      }
      if (fetched.length < SUBGROUPS_PAGINATE_QUERY_MAX) break
      first += SUBGROUPS_PAGINATE_QUERY_MAX
    }
  }

  @StartActiveSpan()
  async getGroupByName(name: string): Promise<GroupRepresentation | undefined> {
    const span = trace.getActiveSpan()
    span?.setAttribute('group.name', name)
    const groups = await this.client.groups.find({ search: name, briefRepresentation: false }) ?? []
    return groups.find(g => g.name === name)
  }

  async getGroupByPath(path: string): Promise<GroupRepresentation | undefined> {
    const parts = path.split('/').filter(Boolean)
    let current: GroupRepresentationWith<'id'> | undefined

    for (const name of parts) {
      current = current
        ? await this.getSubGroupByName(current.id, name)
        : await this.getRootGroupByName(name)

      if (!current) return undefined
    }
    return current
  }

  private async getSubGroupByName(parentId: string, name: string): Promise<GroupRepresentationWith<'id'> | undefined> {
    for await (const subgroup of this.getSubGroups(parentId)) {
      if (subgroup.name === name) {
        const parsed = z.object({ id: z.string() }).and(z.record(z.string(), z.unknown())).safeParse(subgroup)
        return parsed.success ? parsed.data : undefined
      }
    }
    return undefined
  }

  private async getRootGroupByName(name: string): Promise<GroupRepresentationWith<'id'> | undefined> {
    const candidates = await this.client.groups.find({ search: name, briefRepresentation: false }) ?? []
    const match = candidates.find(g => g.path === `/${name}`) ?? candidates.find(g => g.name === name)
    const parsed = z.object({ id: z.string() }).and(z.record(z.string(), z.unknown())).safeParse(match)
    return parsed.success ? parsed.data : undefined
  }

  async deleteGroup(id: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', id)
    await this.client.groups.del({ id })
  }

  async getGroupMembers(groupId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', groupId)
    const members = await this.client.groups.listMembers({ id: groupId })
    return members || []
  }

  @StartActiveSpan()
  async createGroup(name: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('group.name', name)
    this.logger.debug(`Creating Keycloak group: ${name}`)
    const result = await this.client.groups.create({ name })
    return { ...result, name } as GroupRepresentation
  }

  async addUserToGroup(userId: string, groupId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', groupId)
    return this.client.users.addToGroup({ id: userId, groupId })
  }

  async removeUserFromGroup(userId: string, groupId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', groupId)
    return this.client.users.delFromGroup({ id: userId, groupId })
  }

  async* getSubGroups(parentId: string) {
    let first = 0
    while (true) {
      const page = await this.client.groups.listSubGroups({
        parentId,
        briefRepresentation: false,
        max: SUBGROUPS_PAGINATE_QUERY_MAX,
        first,
      })
      if (page.length === 0) break
      for (const subgroup of page) {
        yield subgroup
      }
      if (page.length < SUBGROUPS_PAGINATE_QUERY_MAX) break
      first += SUBGROUPS_PAGINATE_QUERY_MAX
    }
  }

  async getOrCreateGroupByPath(path: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('group.path.depth', path.split('/').filter(Boolean).length)
    const existingGroup = await this.getGroupByPath(path)
    if (existingGroup) return existingGroup

    const parts = path.split('/').filter(Boolean)
    let parentId: string | undefined
    let current: GroupRepresentationWith<'id' | 'name'> | undefined

    for (const name of parts.values()) {
      if (current) {
        if (!parentId) parentId = current.id
        const next = z.object({ id: z.string(), name: z.string() }).safeParse(await this.getOrCreateSubGroupByName(parentId, name))
        if (next.success) current = next.data
      } else {
        const next = z.object({ id: z.string(), name: z.string() }).safeParse(await this.getGroupByName(name) ?? await this.createGroup(name))
        if (next.success) current = next.data
      }
      parentId = current?.id
    }

    return { ...current, path } as GroupRepresentation
  }

  @StartActiveSpan()
  async getOrCreateSubGroupByName(parentId: string, name: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('group.name', name)
    span?.setAttribute('parent.id', parentId)
    for await (const subgroup of this.getSubGroups(parentId)) {
      if (subgroup.name === name) {
        return subgroup
      }
    }
    this.logger.debug(`Creating SubGroup ${name} under parent ${parentId}`)
    const createdGroup = await this.client.groups.createChildGroup({ id: parentId }, { name })
    return { id: createdGroup.id, name } satisfies GroupRepresentation
  }

  async getOrCreateConsoleGroup(projectGroup: GroupRepresentationWith<'id'>) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', projectGroup.id)
    return this.getOrCreateSubGroupByName(projectGroup.id, CONSOLE_GROUP_NAME)
  }

  async getOrCreateRoleGroup(
    consoleGroup: GroupRepresentationWith<'id' | 'name'>,
    oidcGroup: string,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'keycloak.group.id': consoleGroup.id,
      'role.oidc_group.present': !!oidcGroup,
      'role.oidc_group.depth': oidcGroup.split('/').filter(Boolean).length,
    })
    const parts = oidcGroup.split('/').filter(Boolean)
    if (parts.length === 0) {
      throw new Error(`Invalid oidcGroup for project role: "${oidcGroup}"`)
    }

    let current = z.object({
      id: z.string(),
      name: z.string(),
    }).parse(await this.getOrCreateSubGroupByName(consoleGroup.id, parts[0]))

    for (const name of parts.slice(1)) {
      current = z.object({
        id: z.string(),
        name: z.string(),
      }).parse(await this.getOrCreateSubGroupByName(current.id, name))
    }

    return { ...current, path: `/${consoleGroup.name}/${parts.join('/')}` } satisfies GroupRepresentation
  }

  async getOrCreateEnvironmentGroups(consoleGroup: GroupRepresentationWith<'id'>, environment: ProjectWithDetails['environments'][number]) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'keycloak.group.id': consoleGroup.id,
      'environment.id': environment.id,
      'environment.name': environment.name,
    })
    const envGroup = z.object({
      id: z.string(),
      name: z.string(),
    }).parse(await this.getOrCreateSubGroupByName(consoleGroup.id, environment.name))
    const [roGroup, rwGroup] = await Promise.all([
      this.getOrCreateSubGroupByName(envGroup.id, 'RO'),
      this.getOrCreateSubGroupByName(envGroup.id, 'RW'),
    ])
    return { roGroup, rwGroup }
  }

  async onModuleInit() {
    if (!this.config.keycloakRealm) {
      this.logger.fatal('Keycloak realm not configured')
      return
    }
    if (!this.config.keycloakAdmin || !this.config.keycloakAdminPassword) {
      this.logger.fatal('Keycloak admin or admin password not configured')
      return
    }
    this.client.setConfig({ realmName: this.config.keycloakRealm })
    await this.client.auth({
      clientId: 'admin-cli',
      grantType: 'password',
      username: this.config.keycloakAdmin,
      password: this.config.keycloakAdminPassword,
    })
    this.logger.log('Keycloak Admin Client authenticated')
  }
}
