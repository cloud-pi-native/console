import { Inject, Injectable } from '@nestjs/common'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import { CONSOLE_GROUP_NAME } from './keycloak.constant'
import { KeycloakClientService } from './keycloak-client.service'

@Injectable()
export class KeycloakService {
  constructor(
    @Inject(KeycloakClientService) private readonly client: KeycloakClientService,
  ) {
  }

  async *getAllGroups() {
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

  // TODO: May return undefined if group not found in the most recent search
  async getGroupByName(name: string): Promise<GroupRepresentation | undefined> {
    const groups = await this.client.groups.find({ search: name })
    return groups.find(g => g.name === name)
  }

  async getGroupByPath(path: string): Promise<GroupRepresentation | undefined> {
    const parts = path.split('/').filter(Boolean)
    let current: GroupRepresentation | undefined
    for (const name of parts) {
      if (!current) {
        current = await this.getGroupByName(name)
      } else {
        for await (const subgroup of this.getSubGroups(current.id!)) {
          if (subgroup.name === name) {
            current = subgroup
            break
          }
        }
        if (current?.name !== name) return undefined
      }
      if (!current) return undefined
    }
    return current
  }

  async deleteGroup(id: string): Promise<void> {
    await this.client.groups.del({ id })
  }

  async getGroupMembers(groupId: string) {
    return this.client.groups.listMembers({ id: groupId })
  }

  async createGroup(name: string) {
    return this.client.groups.create({ name })
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
    let current: GroupRepresentation | undefined

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      if (!current) {
        current = await this.getGroupByName(name)
        if (!current) {
          current = await this.createGroup(name)
        }
      } else {
        if (!parentId) parentId = current.id!
        current = await this.getOrCreateSubGroupByName(parentId, name)
      }
      parentId = current.id!
    }

    return { id: parentId } satisfies GroupRepresentation
  }

  async getOrCreateSubGroupByName(parentId: string, name: string) {
    for await (const subgroup of this.getSubGroups(parentId)) {
      if (subgroup.name === name) return subgroup
    }
    const createdGroup = await this.client.groups.createChildGroup({ id: parentId }, { name })
    return { id: createdGroup.id } satisfies GroupRepresentation
  }

  async getOrCreateConsoleGroup(projectGroup: GroupRepresentation) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${projectGroup.name}`)
    }
    return this.getOrCreateSubGroupByName(projectGroup.id, CONSOLE_GROUP_NAME)
  }

  async getOrCreateEnvironmentGroups(consoleGroup: GroupRepresentation, environment: ProjectWithDetails['environments'][number]) {
    if (!consoleGroup.id) {
      throw new Error(`Failed to create or retrieve console group for ${consoleGroup.name}`)
    }

    const envGroup = await this.getOrCreateSubGroupByName(consoleGroup.id, environment.name)
    if (!envGroup.id) {
      throw new Error(`Failed to create or retrieve environment group for ${environment.name}`)
    }

    const [roGroup, rwGroup] = await Promise.all([
      this.getOrCreateSubGroupByName(envGroup.id, 'RO'),
      this.getOrCreateSubGroupByName(envGroup.id, 'RW'),
    ])
    if (!roGroup.id || !rwGroup.id) {
      throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
    }

    return { roGroup, rwGroup }
  }
}
