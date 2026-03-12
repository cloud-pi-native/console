import { Inject, Injectable, Logger } from '@nestjs/common'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import { CONSOLE_GROUP_NAME } from './keycloak.constants'
import { KeycloakClientService } from './keycloak-client.service'
import { trace } from '@opentelemetry/api'
import type { GroupRepresentationWith } from './keycloack.utils'
import z from 'zod'

const tracer = trace.getTracer('keycloak-service')

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name)

  constructor(
    @Inject(KeycloakClientService) private readonly client: KeycloakClientService,
  ) {
  }

  async* getAllGroups() {
    let first = 0
    while (true) {
      const fetched = await this.client.groups.find({ first, max: 50, briefRepresentation: false })
      if (fetched.length === 0) break
      for (const group of fetched) {
        yield group
      }
      if (fetched.length < 50) break
      first += 50
    }
  }

  async getGroupByName(name: string): Promise<GroupRepresentation | undefined> {
    return tracer.startActiveSpan('getGroupByName', async (span) => {
      try {
        span.setAttribute('group.name', name)
        const groups = await this.client.groups.find({ search: name, briefRepresentation: false })
        const result = groups.find(g => g.name === name)
        return result
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async getGroupByPath(path: string): Promise<GroupRepresentation | undefined> {
    const parts = path.split('/').filter(Boolean)
    let current: GroupRepresentationWith<'id'> | undefined
    for (const name of parts) {
      if (current) {
        for await (const subgroup of this.getSubGroups(current.id!)) {
          if (subgroup.name === name) {
            const next = z.object({ id: z.string() }).safeParse(subgroup)
            if (next.success) current = next.data
            break
          }
        }
        if (current?.name !== name) return undefined
      } else {
        const candidates = await this.client.groups.find({ search: name, briefRepresentation: false })
        const next = z.object({ id: z.string() }).safeParse(candidates.find(g => g.path === `/${name}`) ?? candidates.find(g => g.name === name))
        if (next.success) current = next.data
      }
      if (!current) return undefined
    }
    return current
  }

  async deleteGroup(id: string): Promise<void> {
    await this.client.groups.del({ id })
  }

  async getGroupMembers(groupId: string) {
    // The type is lying, it can be undefined
    const members = await this.client.groups.listMembers({ id: groupId })
    return members || []
  }

  async createGroup(name: string) {
    return tracer.startActiveSpan('createGroup', async (span) => {
      try {
        span.setAttribute('group.name', name)
        this.logger.debug(`Creating Keycloak group: ${name}`)
        const result = await this.client.groups.create({ name })
        return { ...result, name } as GroupRepresentation
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async addUserToGroup(userId: string, groupId: string) {
    return this.client.users.addToGroup({ id: userId, groupId })
  }

  async removeUserFromGroup(userId: string, groupId: string) {
    return this.client.users.delFromGroup({ id: userId, groupId })
  }

  async* getSubGroups(parentId: string) {
    let first = 0
    while (true) {
      const page = await this.client.groups.listSubGroups({ parentId, briefRepresentation: false, max: 10, first })
      if (page.length === 0) break
      for (const subgroup of page) {
        yield subgroup
      }
      if (page.length < 10) break
      first += 10
    }
  }

  async getOrCreateGroupByPath(path: string) {
    const existingGroup = await this.getGroupByPath(path)
    if (existingGroup) return existingGroup

    const parts = path.split('/').filter(Boolean)
    let parentId: string | undefined
    let current: GroupRepresentationWith<'id'> | undefined

    for (const name of parts.values()) {
      if (!current) {
        const next = z.object({ id: z.string() }).safeParse(await this.getGroupByName(name) ?? await this.createGroup(name))
        if (next.success) current = next.data
      } else {
        if (!parentId) parentId = current.id
        const next = z.object({ id: z.string() }).safeParse(await this.getOrCreateSubGroupByName(parentId, name))
        if (next.success) current = next.data
      }
      parentId = current?.id
    }

    return { ...current, path } as GroupRepresentation
  }

  async getOrCreateSubGroupByName(parentId: string, name: string) {
    return tracer.startActiveSpan('getOrCreateSubGroupByName', async (span) => {
      try {
        span.setAttribute('group.name', name)
        span.setAttribute('parent.id', parentId)
        for await (const subgroup of this.getSubGroups(parentId)) {
          if (subgroup.name === name) {
            return subgroup
          }
        }
        this.logger.debug(`Creating SubGroup ${name} under parent ${parentId}`)
        const createdGroup = await this.client.groups.createChildGroup({ id: parentId }, { name })
        return { id: createdGroup.id, name } satisfies GroupRepresentation
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async getOrCreateConsoleGroup(projectGroup: GroupRepresentationWith<'id'>) {
    return this.getOrCreateSubGroupByName(projectGroup.id, CONSOLE_GROUP_NAME)
  }

  async getOrCreateRoleGroup(
    consoleGroup: GroupRepresentationWith<'id' | 'name'>,
    oidcGroup: string,
  ) {
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
}
