import type KcAdminClient from '@keycloak/keycloak-admin-client'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation'
import type { Credentials } from '@keycloak/keycloak-admin-client/lib/utils/auth'
import type { OnModuleInit } from '@nestjs/common'
import type { KeycloakConfig } from '../../config/keycloak'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import type { GroupRepresentationWith } from './keycloak.utils'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import z from 'zod'
import { InjectKeycloakConfig } from '../../config/keycloak'
import { getErrorResponseStatus } from '../../utils/http-error'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { ADMIN_AUTH_REALM, ADMIN_TOKEN_REFRESH_INTERVAL_MS, CONSOLE_GROUP_NAME, PASSWORD_GRANT_TYPE, REFRESH_TOKEN_GRANT_TYPE, SUBGROUPS_PAGINATE_QUERY_MAX } from './keycloak.constants'

export const KEYCLOAK_ADMIN_CLIENT = Symbol('KEYCLOAK_ADMIN_CLIENT')

@Injectable()
export class KeycloakClientService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakClientService.name)

  private authenticated = false

  constructor(
    @InjectKeycloakConfig() private readonly config: KeycloakConfig,
    @Inject(KEYCLOAK_ADMIN_CLIENT) private readonly client: KcAdminClient,
  ) {
  }

  async* getAllGroups() {
    let first = 0
    while (true) {
      const fetched = await this.client.groups.find({ first, max: SUBGROUPS_PAGINATE_QUERY_MAX, briefRepresentation: false })
      this.logger.verbose(`Loaded a Keycloak groups page (first=${first}, count=${fetched.length})`)
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
    this.logger.verbose(`Resolving Keycloak group path ${path} (depth=${parts.length})`)
    let current: GroupRepresentationWith<'id'> | undefined
    if (parts.length === 0) return undefined

    for (const name of parts) {
      current = current
        ? await this.getSubGroupByName(current.id, name)
        : await this.getRootGroupByName(name)

      if (!current) {
        this.logger.verbose(`Keycloak group path segment was not found (path=${path}, missing=${name})`)
        return undefined
      }
    }
    this.logger.verbose(`Keycloak group path resolved (path=${path}, groupId=${current?.id})`)
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
    this.logger.log(`Deleting Keycloak group (groupId=${id})`)
    await this.client.groups.del({ id })
  }

  async getGroupMembers(groupId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', groupId)
    const members = await this.client.groups.listMembers({ id: groupId })
    this.logger.verbose(`Loaded Keycloak group members (groupId=${groupId}, count=${members?.length ?? 0})`)
    return members || []
  }

  async getUserByEmail(email: string): Promise<UserRepresentation | undefined> {
    const users = await this.client.users.find({
      email,
      exact: true,
      max: 1,
    })
    return users[0]
  }

  @StartActiveSpan()
  async createGroup(name: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('group.name', name)
    this.logger.debug(`Creating Keycloak group ${name}`)
    const result = await this.client.groups.create({ name })
    return { ...result, name } as GroupRepresentation
  }

  async addUserToGroup(userId: string, groupId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', groupId)
    this.logger.verbose(`Adding user to Keycloak group (userId=${userId}, groupId=${groupId})`)
    return this.client.users.addToGroup({ id: userId, groupId })
  }

  async removeUserFromGroup(userId: string, groupId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', groupId)
    this.logger.verbose(`Removing user from Keycloak group (userId=${userId}, groupId=${groupId})`)
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
      this.logger.verbose(`Loaded a Keycloak subgroups page (parentId=${parentId}, first=${first}, count=${page.length})`)
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
    this.logger.verbose(`Ensuring Keycloak group path exists: ${path}`)
    const existingGroup = await this.getGroupByPath(path)
    if (existingGroup) {
      this.logger.verbose(`Keycloak group already exists at path ${path}`)
      return existingGroup
    }

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

    if (current) {
      this.logger.log(`Created Keycloak group path ${path} (groupId=${current.id})`)
    }
    return { ...current, path } as GroupRepresentation
  }

  @StartActiveSpan()
  async getOrCreateSubGroupByName(parentId: string, name: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('group.name', name)
    span?.setAttribute('parent.id', parentId)
    const existing = await this.findSubGroupByName(parentId, name)
    if (existing) return existing

    this.logger.debug(`Creating Keycloak subgroup ${name} under parentId=${parentId}`)
    try {
      const createdGroup = await this.client.groups.createChildGroup({ id: parentId }, { name })
      return { id: createdGroup.id, name } satisfies GroupRepresentation
    } catch (err) {
      // A concurrent reconciliation may have created the subgroup between the
      // scan and the create; treat the 409 as "already exists" and re-fetch it
      if (getErrorResponseStatus(err) !== 409) throw err
      this.logger.verbose(`Keycloak subgroup ${name} was created concurrently under parentId=${parentId}, fetching it`)
      const subgroup = await this.findSubGroupByName(parentId, name)
      if (!subgroup) throw err
      return subgroup
    }
  }

  private async findSubGroupByName(parentId: string, name: string): Promise<GroupRepresentation | undefined> {
    for await (const subgroup of this.getSubGroups(parentId)) {
      if (subgroup.name === name) {
        return subgroup
      }
    }
    return undefined
  }

  async getOrCreateConsoleGroup(projectGroup: GroupRepresentationWith<'id'>) {
    const span = trace.getActiveSpan()
    span?.setAttribute('keycloak.group.id', projectGroup.id)
    this.logger.verbose(`Ensuring Keycloak console group exists (projectGroupId=${projectGroup.id})`)
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
    this.logger.verbose(`Resolved Keycloak environment groups (consoleGroupId=${consoleGroup.id}, env=${environment.name}, envGroupId=${envGroup.id})`)
    return { roGroup, rwGroup }
  }

  async onModuleInit() {
    if (!this.config.keycloakRealm) {
      throw new Error('Keycloak realm is not configured')
    }
    if (!this.config.keycloakAdmin || !this.config.keycloakAdminPassword) {
      throw new Error('Keycloak admin username or password is not configured')
    }
    if (!this.config.keycloakAdminClientId) {
      throw new Error('Keycloak admin client id is not configured')
    }
    try {
      this.logger.log(`Authenticating Keycloak admin client (realm=${this.config.keycloakRealm})`)
      await this.authenticate(this.passwordCredentials())
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(`Keycloak Admin Client authentication failed: ${err.message}`, err.stack)
      } else {
        this.logger.error(`Keycloak Admin Client authentication failed: ${String(err)}`)
      }
      throw err
    }
    this.client.setConfig({ realmName: this.config.keycloakRealm })
    this.authenticated = true
    this.logger.log(`Keycloak Admin Client authenticated (realm=${this.config.keycloakRealm})`)
  }

  // The admin client never refreshes its token on its own; without this the
  // access token expires (~60s) and every admin call fails with a 401
  @Interval(ADMIN_TOKEN_REFRESH_INTERVAL_MS)
  async refreshAdminToken() {
    if (!this.authenticated) return
    try {
      await this.authenticate(this.refreshTokenCredentials())
    } catch (refreshErr) {
      // The refresh token itself can expire or be revoked (e.g. Keycloak
      // restart); fall back to a full re-authentication to recover
      this.logger.warn(`Keycloak Admin Client token refresh failed, re-authenticating: ${refreshErr instanceof Error ? refreshErr.message : String(refreshErr)}`)
      try {
        await this.authenticate(this.passwordCredentials())
      } catch (err) {
        this.logger.error(`Keycloak Admin Client re-authentication failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // Checked by onModuleInit before any authentication; the getter narrows the
  // config value so Credentials.clientId stays a plain string
  private get adminClientId(): string {
    if (!this.config.keycloakAdminClientId) {
      throw new Error('KEYCLOAK_ADMIN_CLIENT_ID is not configured')
    }
    return this.config.keycloakAdminClientId
  }

  private passwordCredentials(): Credentials {
    return {
      clientId: this.adminClientId,
      grantType: PASSWORD_GRANT_TYPE,
      username: this.config.keycloakAdmin,
      password: this.config.keycloakAdminPassword,
    }
  }

  private refreshTokenCredentials(): Credentials {
    return {
      clientId: this.adminClientId,
      grantType: REFRESH_TOKEN_GRANT_TYPE,
      refreshToken: this.client.refreshToken,
    }
  }

  // auth() resolves the token endpoint from client.realmName, which onModuleInit
  // switches to the project realm — the admin user lives in the master realm.
  // Restore the realm even when auth fails: the still-valid previous token keeps
  // serving admin calls, and those must target the project realm, not master
  private async authenticate(credentials: Credentials) {
    const realmName = this.client.realmName
    this.client.setConfig({ realmName: ADMIN_AUTH_REALM })
    try {
      await this.client.auth(credentials)
    } finally {
      this.client.setConfig({ realmName })
    }
  }
}
